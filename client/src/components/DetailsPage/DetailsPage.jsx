import React, { useState } from 'react';

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

// Reusable animated button component
const AnimatedButton = ({ onClick, children, className }) => {
  const [isFlashing, setIsFlashing] = React.useState(false);

  const handleClick = async () => {
    if (!isFlashing) {
      setIsFlashing(true);
      onClick?.();
      setTimeout(() => {
        setIsFlashing(false);
      }, 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      <div className="relative z-10">{children}</div>
      {isFlashing && (
        <div 
          className="absolute inset-0 bg-[#FFD700] animate-flash"
          style={{ opacity: 0.3 }}
        />
      )}
    </button>
  );
};

// Copy button with notification
const CopyButton = ({ text }) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative">
      <div className={`
        absolute -top-8 left-1/2 -translate-x-1/2 
        text-[#FFD700] text-sm font-medium
        transition-all duration-200
        ${showCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
      `}>
        Copied
      </div>
      
      <AnimatedButton
        onClick={handleCopy}
        className="text-gray-400 hover:text-[#FFD700] transition-colors p-1.5 rounded-md hover:bg-[#FFD700]/10"
      >
        <CopyIcon />
      </AnimatedButton>
    </div>
  );
};

const DetailsPage = ({ isOpen, meme }) => {
  const buttonBaseClass = "w-full px-4 py-3 bg-[#1E1E22] text-gray-200 rounded-xl font-medium border border-[#FFD700]/10 hover:border-[#FFD700]/30 transition-all";

  return (
    <div className={`fixed left-0 right-0 bg-[#121214] z-50 transition-transform duration-300 ${
      isOpen ? 'translate-y-0' : 'translate-y-[-120%]'
    }`}
    style={{
      top: '240px',
      bottom: '60px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <div className="max-w-md mx-auto p-4 h-full overflow-y-auto">
        <div className="space-y-4">
          {/* Contract Section */}
          {meme?.projectDetails?.contract && (
            <div className="bg-[#1E1E22] rounded-xl p-4 border border-[#FFD700]/10">
              <div className="text-sm text-gray-400 mb-2 text-center">Contract Address</div>
              <div className="flex items-center gap-2 bg-[#2A2A2E] rounded-lg px-3 py-2">
                <div className="text-gray-200 text-sm truncate flex-1">
                  {meme.projectDetails.contract}
                </div>
                <CopyButton text={meme.projectDetails.contract} />
              </div>
            </div>
          )}

          {/* Dynamic Action Buttons */}
          <div className="space-y-2">
            {meme?.projectDetails?.buttons?.map((button, index) => (
              <AnimatedButton
                key={index}
                onClick={() => window.open(button.url, '_blank')}
                className={buttonBaseClass}
              >
                {button.label}
              </AnimatedButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsPage;