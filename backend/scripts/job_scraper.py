from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os
import time
from datetime import datetime
from dotenv import load_dotenv
import sys
import json

# Add the parent directory to sys.path to import config
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from config import db

class JobScraper:
    def __init__(self, search_site="linkedin", time_since_posted='', job_search_keywords=None, 
                 job_type=['F'], job_experience=['1', '2'], job_location="United States", 
                 num_jobs_to_scrape=2000):
        """
        Initializes the JobScraper class.
        :param search_site: Job search website (default: LinkedIn)
        :param job_search_keywords: List of job titles to search for
        :param job_type: F for Full-time, C for Contract, etc.
        :param job_experience: Experience levels (1: Internship, 2: Entry level, etc.)
        :param job_location: Location to search in
        :param num_jobs_to_scrape: Number of jobs to scrape (default: 2000)
        """
        if job_search_keywords is None:
            job_search_keywords = ["Data Scientist", "Data Engineer", "Machine Learning Engineer"]

        self.job_location = job_location
        self.job_type = job_type
        self.job_experience = job_experience
        self.search_site = search_site.lower()
        self.job_search_keywords = job_search_keywords
        self.time_since_posted = time_since_posted
        self.num_jobs_to_scrape = num_jobs_to_scrape
        self.jobs_collection = db["jobs"]
        self.total_jobs = 0
        self.new_jobs = 0
        self.duplicates = 0

        # Load environment variables
        #env_path = os.path.join(os.path.dirname(backend_dir), '.env')
        #print(f"\nLooking for .env file at: {env_path}")
        #load_dotenv(env_path)

        # Get LinkedIn credentials
        self.linkedin_email = os.getenv("LINKEDIN_EMAIL")
        self.linkedin_password = os.getenv("LINKEDIN_PASSWORD")
        
        if not self.linkedin_email or not self.linkedin_password:
            raise Exception("LinkedIn credentials not found in .env file")

        # Initialize Chrome driver
        print("\nInitializing Chrome driver...")
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=chrome_options
        )
        self.wait = WebDriverWait(self.driver, 10)

    def login_to_linkedin(self):
        """Log in to LinkedIn"""
        try:
            print("Logging in to LinkedIn...")
            self.driver.get("https://www.linkedin.com/login")
            
            # Wait for and fill in email
            email_field = self.wait.until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            email_field.send_keys(self.linkedin_email)
            
            # Fill in password
            password_field = self.driver.find_element(By.ID, "password")
            password_field.send_keys(self.linkedin_password)
            
            # Click login button
            login_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # Wait for login to complete
            time.sleep(5)
            print("Successfully logged in to LinkedIn")
            
        except Exception as e:
            print(f"❌ Error logging in to LinkedIn: {str(e)}")
            raise

    def scrape_job_details(self, job_card):
        """Extract job details from a job card"""
        try:
            # Extract basic job information
            title = job_card.find_element(By.CSS_SELECTOR, "h3.base-search-card__title").text
            company = job_card.find_element(By.CSS_SELECTOR, "h4.base-search-card__subtitle").text
            location = job_card.find_element(By.CSS_SELECTOR, "span.job-search-card__location").text
            job_link = job_card.find_element(By.CSS_SELECTOR, "a.base-card__full-link").get_attribute("href")
            
            # Get job ID from the URL
            job_id = job_link.split('/')[-1]
            
            # Click on the job to load details
            job_card.click()
            time.sleep(2)
            
            # Wait for and get job description
            description = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.show-more-less-html__markup"))
            ).text
            
            # Create job data dictionary
            job_data = {
                "job_id": job_id,
                "title": title,
                "company": company,
                "location": location,
                "url": job_link,
                "summary": description,
                "source": "linkedin",
                "scraped_date": datetime.utcnow(),
                "search_query": self.current_search_query,
                "search_location": self.job_location,
                "posted_date": datetime.utcnow(),  # Actual date not easily accessible
            }
            
            return job_data
            
        except Exception as e:
            print(f"❌ Error extracting job details: {str(e)}")
            return None

    def scrape_jobs(self):
        """
        Scrapes job listings from LinkedIn and stores them in MongoDB.
        """
        # Create compound index for deduplication
        self.jobs_collection.create_index([
            ("job_id", 1),
            ("search_query", 1),
            ("scraped_date", 1)
        ], unique=True)

        try:
            # Log in to LinkedIn
            self.login_to_linkedin()
            
            # Iterate through search queries
            for search_query in self.job_search_keywords:
                self.current_search_query = search_query
                print(f"\nSearching for: {search_query} in {self.job_location}")
                
                # Construct search URL
                search_url = (
                    f"https://www.linkedin.com/jobs/search/?"
                    f"keywords={search_query.replace(' ', '%20')}&"
                    f"location={self.job_location.replace(' ', '%20')}&"
                    f"f_TPR=r86400&"  # Last 24 hours
                    f"f_WT=2"  # Remote jobs
                )
                
                # Load search results
                self.driver.get(search_url)
                time.sleep(3)
                
                # Scroll to load more jobs
                jobs_to_scrape = min(50, self.num_jobs_to_scrape // len(self.job_search_keywords))
                self.scroll_to_load_jobs(jobs_to_scrape)
                
                # Get all job cards
                job_cards = self.driver.find_elements(By.CSS_SELECTOR, "div.base-card")
                print(f"Found {len(job_cards)} jobs matching '{search_query}'")
                
                # Process each job
                for job_card in job_cards[:jobs_to_scrape]:
                    try:
                        job_data = self.scrape_job_details(job_card)
                        if job_data:
                            try:
                                self.jobs_collection.insert_one(job_data)
                                self.new_jobs += 1
                                print(f"✅ Added new job: {job_data['title']} at {job_data['company']}")
                            except Exception as e:
                                if "duplicate key error" in str(e).lower():
                                    self.duplicates += 1
                                    print(f"⚠️ Duplicate job: {job_data['title']} at {job_data['company']}")
                                else:
                                    print(f"❌ Error saving job: {str(e)}")
                            
                            self.total_jobs += 1
                            
                        # Add delay between jobs
                        time.sleep(2)
                        
                    except Exception as e:
                        print(f"❌ Error processing job card: {str(e)}")
                        continue

        except Exception as e:
            print(f"❌ Error during scraping: {str(e)}")
        finally:
            # Clean up
            try:
                self.driver.quit()
            except:
                pass
            
            # Print summary
            print("\nScraping completed!")
            print(f"Total jobs processed: {self.total_jobs}")
            print(f"New jobs added: {self.new_jobs}")
            print(f"Duplicates skipped: {self.duplicates}")

    def scroll_to_load_jobs(self, target_jobs):
        """Scroll the page to load more jobs"""
        current_jobs = 0
        max_scrolls = 30
        scroll_count = 0
        
        while current_jobs < target_jobs and scroll_count < max_scrolls:
            # Scroll to bottom
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Get current job count
            job_cards = self.driver.find_elements(By.CSS_SELECTOR, "div.base-card")
            current_jobs = len(job_cards)
            
            # Click "Show more jobs" button if present
            try:
                show_more_button = self.driver.find_element(By.CSS_SELECTOR, "button.infinite-scroller__show-more-button")
                show_more_button.click()
                time.sleep(2)
            except:
                pass
                
            scroll_count += 1

if __name__ == "__main__":
    try:
        scraper = JobScraper(
            job_search_keywords=[
                "data scientist",
                "data engineer",
                "machine learning engineer",
                "data analyst",
                "data architect",
                "business intelligence analyst",
                "analytics engineer",
                "data science manager",
                "AI engineer",
                "quantitative analyst"
            ],
            job_location="United States",
            num_jobs_to_scrape=2000
        )
        scraper.scrape_jobs()
    except Exception as e:
        print(f"❌ Error: {str(e)}")
