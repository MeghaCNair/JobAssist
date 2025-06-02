import requests
from bs4 import BeautifulSoup
import pandas as pd
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.probability import FreqDist
from collections import defaultdict
import re
import time
import random

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('averaged_perceptron_tagger')

class JobMarketScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.base_url = 'https://www.indeed.com'
        self.stop_words = set(stopwords.words('english'))
        
    def get_soup(self, url):
        """Make a request to URL and return BeautifulSoup object"""
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            print(f"Error fetching {url}: {str(e)}")
            return None

    def extract_job_types(self):
        """Extract common job types from Indeed"""
        job_types = [
            "Full-time", "Part-time", "Contract", "Temporary",
            "Internship", "Remote", "Freelance", "Permanent"
        ]
        return job_types

    def extract_locations(self):
        """Extract popular job locations"""
        locations = [
            "New York, NY", "San Francisco, CA", "Seattle, WA",
            "Austin, TX", "Boston, MA", "Chicago, IL",
            "Los Angeles, CA", "Remote", "Washington, DC",
            "Denver, CO"
        ]
        return locations

    def extract_industries(self):
        """Extract common industries"""
        industries = [
            "Technology", "Healthcare", "Finance", "Education",
            "Manufacturing", "Retail", "Marketing", "Consulting",
            "Entertainment", "Real Estate", "Construction",
            "Hospitality"
        ]
        return industries

    def extract_skills(self, num_pages=5):
        """Extract common skills from job descriptions"""
        skills = defaultdict(int)
        technical_skills = set([
            'python', 'java', 'javascript', 'react', 'angular', 'vue',
            'node', 'sql', 'mongodb', 'aws', 'azure', 'docker',
            'kubernetes', 'git', 'agile', 'scrum', 'ci/cd', 'rest',
            'api', 'html', 'css', 'typescript', 'c++', 'c#',
            'machine learning', 'ai', 'data science', 'analytics'
        ])
        
        soft_skills = set([
            'communication', 'leadership', 'teamwork', 'problem solving',
            'analytical', 'organization', 'time management', 'creativity',
            'collaboration', 'adaptability', 'project management'
        ])

        try:
            for page in range(num_pages):
                url = f"{self.base_url}/jobs?q=software+developer&l=&from=searchOnHP&vjk=37f3d40da3e461b7"
                if page > 0:
                    url += f"&start={page * 10}"
                
                soup = self.get_soup(url)
                if not soup:
                    continue

                job_cards = soup.find_all('div', class_='job_seen_beacon')
                
                for job in job_cards:
                    description = job.find('div', class_='job-snippet')
                    if description:
                        text = description.get_text().lower()
                        words = word_tokenize(text)
                        
                        # Extract skills
                        for word in words:
                            if word in technical_skills:
                                skills[word] += 1
                            elif word in soft_skills:
                                skills[word] += 1
                
                # Be nice to the server
                time.sleep(random.uniform(2, 4))

        except Exception as e:
            print(f"Error extracting skills: {str(e)}")

        # Sort skills by frequency
        sorted_skills = dict(sorted(skills.items(), key=lambda x: x[1], reverse=True))
        return sorted_skills

    def get_market_data(self):
        """Get comprehensive job market data"""
        return {
            'job_types': self.extract_job_types(),
            'locations': self.extract_locations(),
            'industries': self.extract_industries(),
            'skills': self.extract_skills(num_pages=3)
        }

if __name__ == '__main__':
    scraper = JobMarketScraper()
    market_data = scraper.get_market_data()
    print("Job Market Data:")
    print("===============")
    for category, data in market_data.items():
        print(f"\n{category.title()}:")
        if isinstance(data, dict):
            for item, count in list(data.items())[:10]:
                print(f"- {item}: {count}")
        else:
            for item in data:
                print(f"- {item}") 