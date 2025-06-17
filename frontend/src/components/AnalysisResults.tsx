import React from 'react';

interface AnalysisResultsProps {
  results: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  const formatText = (text: string) => {
    // Split text into paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if paragraph is a heading (starts with #)
      if (paragraph.startsWith('#')) {
        const level = paragraph.match(/^#+/)?.[0].length || 1;
        const content = paragraph.replace(/^#+\s*/, '');
        return (
          <h2 
            key={index}
            className={`font-bold mb-4 ${
              level === 1 ? 'text-2xl' : 
              level === 2 ? 'text-xl' : 
              'text-lg'
            }`}
          >
            {content}
          </h2>
        );
      }

      // Check if paragraph is a list item
      if (paragraph.startsWith('- ')) {
        return (
          <ul key={index} className="list-disc list-inside mb-4">
            {paragraph.split('\n').map((item, i) => (
              <li key={i} className="mb-2">
                {item.replace(/^-\s*/, '')}
              </li>
            ))}
          </ul>
        );
      }

      // Regular paragraph
      return (
        <p key={index} className="mb-4">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Resume Analysis</h2>
        <div className="flex items-center">
          <div className="text-4xl font-bold text-blue-600 mr-4">
            {results.score}%
          </div>
          <div className="text-gray-600">
            Overall Score
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Feedback</h3>
        <div className="prose max-w-none">
          {formatText(results.feedback)}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">Suggestions</h3>
        <ul className="list-disc list-inside space-y-2">
          {results.suggestions.map((suggestion, index) => (
            <li key={index} className="text-gray-700">
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AnalysisResults; 