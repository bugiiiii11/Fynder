// MemeStack.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MemeCard from '../MemeCard/MemeCard';
import { ENDPOINTS } from '../../config/api';

const MemeStack = ({ memes, onMemeChange, currentMeme: propCurrentMeme, userData }) => {
  const [currentMeme, setCurrentMeme] = React.useState(null);
  const [nextMeme, setNextMeme] = React.useState(null);
  const [lastSwipe, setLastSwipe] = React.useState(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  console.log('===== DEBUG: MemeStack Props =====');
  console.log('Received memes:', memes.map(m => ({
    id: m.id,
    projectName: m.projectName,
    engagement: m.engagement || { likes: 0, superLikes: 0, dislikes: 0 }
  })));
  console.log('================================');

  const getWeightedRandomMeme = React.useCallback(() => {
    console.log('===== Getting Random Meme =====');
    console.log('Total memes available:', memes.length);
    
    // Filter out both current and next meme IDs
    const currentMemeId = currentMeme?.id;
    const nextMemeId = nextMeme?.id;
    console.log('Filtering out memes:', { currentMemeId, nextMemeId });
    
    const availableMemes = memes.filter(meme => 
      meme.id !== currentMemeId && meme.id !== nextMemeId
    );
    
    console.log('Filtered available memes:', availableMemes.length);
  
    if (availableMemes.length === 0) {
      console.log('No available unique memes, using all memes except current');
      // If no other memes available, at least avoid the current meme
      const fallbackMemes = memes.filter(meme => meme.id !== currentMemeId);
      if (fallbackMemes.length === 0) {
        console.log('Using first meme as last resort');
        return {
          ...memes[0],
          engagement: {
            likes: parseInt(memes[0].engagement?.likes || 0),
            superLikes: parseInt(memes[0].engagement?.superLikes || 0),
            dislikes: parseInt(memes[0].engagement?.dislikes || 0)
          }
        };
      }
      availableMemes.push(...fallbackMemes);
    }
  
    // Calculate total weight for available memes
    const totalWeight = availableMemes.reduce((sum, meme) => sum + (meme.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const meme of availableMemes) {
      random -= (meme.weight || 1);
      if (random <= 0) {
        const selectedMeme = {
          ...meme,
          engagement: {
            likes: parseInt(meme.engagement?.likes || 0),
            superLikes: parseInt(meme.engagement?.superLikes || 0),
            dislikes: parseInt(meme.engagement?.dislikes || 0)
          }
        };
        
        console.log('Selected meme with engagement:', {
          id: selectedMeme.id,
          projectName: selectedMeme.projectName,
          engagement: selectedMeme.engagement
        });
        
        return selectedMeme;
      }
    }
    
    // Fallback to first available meme if needed
    const fallbackMeme = {
      ...availableMemes[0],
      engagement: {
        likes: parseInt(availableMemes[0].engagement?.likes || 0),
        superLikes: parseInt(availableMemes[0].engagement?.superLikes || 0),
        dislikes: parseInt(availableMemes[0].engagement?.dislikes || 0)
      }
    };
    
    console.log('Fallback meme selected:', {
      id: fallbackMeme.id,
      projectName: fallbackMeme.projectName,
      engagement: fallbackMeme.engagement
    });
    
    return fallbackMeme;
  }, [memes, currentMeme, nextMeme]);

  // Initialize memes
  React.useEffect(() => {
    if (memes.length > 0 && !currentMeme) {
      console.log('Initializing first meme with engagement data');
      const firstMeme = propCurrentMeme || getWeightedRandomMeme();
      console.log('First meme:', {
        id: firstMeme.id,
        engagement: firstMeme.engagement
      });
      
      setCurrentMeme(firstMeme);
      onMemeChange(firstMeme);
      
      const secondMeme = getWeightedRandomMeme();
      console.log('Next meme:', {
        id: secondMeme.id,
        engagement: secondMeme.engagement
      });
      setNextMeme(secondMeme);
    }
  }, [memes, propCurrentMeme, getWeightedRandomMeme, onMemeChange]);

  const transitionToNextMeme = React.useCallback(() => {
    if (!nextMeme) return;
    
    console.log('Transitioning to next meme with engagement:', nextMeme);
    
    // Set current meme to next meme
    setCurrentMeme(nextMeme);
    onMemeChange(nextMeme);
    
    // Slight delay before setting next meme to prevent blinking
    setTimeout(() => {
      const newNextMeme = getWeightedRandomMeme();
      console.log('New next meme with engagement:', newNextMeme);
      setNextMeme(newNextMeme);
    }, 200); // Delay matches the exit animation duration
    
  }, [nextMeme, getWeightedRandomMeme, onMemeChange]);

  React.useEffect(() => {
    setIsMobile(!!window.Telegram?.WebApp);
  }, []);

  const handleSwipe = async (direction) => {
    if (isAnimating || !currentMeme) return;
    
    console.log('Handling swipe:', direction);
    console.log('Current meme before swipe:', {
      id: currentMeme.id,
      engagement: currentMeme.engagement
    });
    
    setIsAnimating(true);
    setLastSwipe(direction);
  
    // Transition to next meme immediately
    transitionToNextMeme();
    
    // Handle interaction in the background
    try {
      const action = direction === 'right' ? 'like' : 
                    direction === 'left' ? 'dislike' : 'superlike';
  
    const response = await fetch(ENDPOINTS.interactions.update, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin,
        'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '' // Add this line
      },
      body: JSON.stringify({
        action,
        memeId: currentMeme.id,
        telegramId: userData?.telegramId,
        username: userData?.username
      })
    });
  
      const data = await response.json();
      console.log('Interaction response:', data);
  
      if (!data.success) {
        throw new Error(data.error || 'Interaction failed');
      }
    } catch (error) {
      console.error('Interaction error:', error);
    } finally {
      setTimeout(() => {
        setLastSwipe(null);
        setIsAnimating(false);
      }, 300); // Reduced from default timing
    }
  };

  return (
    <div className="relative max-w-[calc(100vw-32px)] mx-auto aspect-square bg-[#121214]">
      {/* Background Layer (Next Meme) - Always below */}
      <div className="absolute inset-0 z-10">
        {nextMeme && (
          <MemeCard
            meme={nextMeme}
            onSwipe={() => {}}
            isTop={false}
            userData={userData}
          />
        )}
      </div>
  
      {/* Top Layer (Current Meme) - With animation */}
      <AnimatePresence mode="sync">
        {currentMeme && (
          <motion.div
            key={currentMeme.id}
            className="absolute inset-0 z-20"
            initial={false}
            animate={{ 
              opacity: isDragging ? 0.5 : 1,
              scale: 1,
              zIndex: 20
            }}
            exit={{ 
              opacity: 0,
              scale: 0.95,
              transition: { 
                duration: 0.2,
                ease: "easeOut"
              }
            }}
          >
            <MemeCard
              meme={currentMeme}
              onSwipe={handleSwipe}
              isTop={true}
              isMobile={isMobile}
              userData={userData}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(e, info) => {
                setIsDragging(false);
                const xVel = info.velocity.x;
                const yVel = info.velocity.y;
                const xOffset = info.offset.x;
                const yOffset = info.offset.y;
                
                if (Math.abs(yVel) > Math.abs(xVel) && yOffset < -50) {
                  handleSwipe('super');
                } else if (xOffset > 50) {
                  handleSwipe('right');
                } else if (xOffset < -50) {
                  handleSwipe('left');
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
  
      {/* Swipe Indicator Overlay - Always on top */}
          <AnimatePresence>
      {lastSwipe && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {lastSwipe === 'right' && (
          <>
            {/* Background particles for LIKE */}
            <motion.div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`like-particle-${i}`}
                  className="absolute w-8 h-8 text-2xl"
                  initial={{ 
                    x: "50%",
                    y: "50%",
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{ 
                    x: `${50 + (Math.random() * 80 - 40)}%`,
                    y: `${50 + (Math.random() * 80 - 40)}%`,
                    scale: [0, 2, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                >
                  {["👍", "💖", "✨", "💚"][i % 4]}
                </motion.div>
              ))}
            </motion.div>
            
            {/* Main LIKE indicator - keep your existing code */}
            <motion.div 
              className="px-8 py-4 rounded-2xl border-4 border-green-500 shadow-xl backdrop-blur-sm bg-green-500/90"
              initial={{ x: -100, rotate: -45, scale: 0 }}
              animate={{ 
                x: 0, 
                rotate: 0, 
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 15
                }
              }}
              exit={{ 
                x: 100,
                rotate: 45,
                scale: 0,
                transition: { duration: 0.2 }
                }}
              >
                <div className="text-4xl font-bold text-white flex items-center gap-3">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      transition: {
                        duration: 0.3,
                        times: [0, 0.5, 1]
                      }
                    }}
                  >
                    👍 LIKE
                  </motion.span>
                </div>
              </motion.div>
            </>
          )}

          {lastSwipe === 'left' && (
            <>
              {/* Background particles for NOPE */}
              <motion.div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`nope-particle-${i}`}
                    className="absolute w-8 h-8 text-2xl"
                    initial={{ 
                      x: "50%", 
                      y: "50%", 
                      scale: 0 
                    }}
                    animate={{ 
                      x: `${50 + (Math.random() * 60 - 30)}%`,
                      y: `${50 + (Math.random() * 60 - 30)}%`,
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                  >
                    {["👎", "❌", "💢"][i % 3]}
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                className="px-8 py-4 rounded-2xl border-4 border-red-500 shadow-xl backdrop-blur-sm bg-red-500/90"
                initial={{ x: 100, rotate: 45, scale: 0 }}
                animate={{ 
                  x: 0, 
                  rotate: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 15
                  }
                }}
                exit={{ 
                  x: -100,
                  rotate: -45,
                  scale: 0,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="text-4xl font-bold text-white flex items-center gap-3">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      transition: {
                        duration: 0.3,
                        times: [0, 0.5, 1]
                      }
                    }}
                  >
                    👎 NOPE
                  </motion.span>
                </div>
              </motion.div>
            </>
          )}

          {lastSwipe === 'super' && (
            <>
              {/* Background effects for SUPER */}
              <motion.div className="absolute inset-0 overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`super-particle-${i}`}
                    className="absolute w-8 h-8 text-2xl"
                    initial={{ 
                      x: "50%", 
                      y: "50%", 
                      scale: 0 
                    }}
                    animate={{ 
                      x: `${50 + (Math.random() * 60 - 30)}%`,
                      y: `${50 + (Math.random() * 60 - 30)}%`,
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                  >
                    {["⭐", "✨", "💫", "🌟"][i % 4]}
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                className="px-8 py-4 rounded-2xl border-4 border-blue-500 shadow-xl backdrop-blur-sm bg-blue-500/90"
                initial={{ y: 100, scale: 0 }}
                animate={{ 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 15
                  }
                }}
                exit={{ 
                  y: -100,
                  scale: 0,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="text-4xl font-bold text-white flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      rotate: [0, 180, 360],
                      transition: {
                        duration: 0.5,
                        ease: "easeInOut"
                      }
                    }}
                  >
                    ⭐ SUPER
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
};

export default MemeStack;