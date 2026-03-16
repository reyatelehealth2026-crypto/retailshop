import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface Banner {
  id: number;
  imageUrl?: string;
  title: string;
  subtitle?: string;
  link?: string;
  bgColor?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoPlay?: boolean;
  interval?: number;
}

export const BannerCarousel = ({
  banners,
  autoPlay = true,
  interval = 5000,
}: BannerCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  const paginate = useCallback(
    (newDirection: number) => {
      setDirection(newDirection);
      setCurrentIndex((prev) => {
        if (newDirection === 1) {
          return prev === banners.length - 1 ? 0 : prev + 1;
        }
        return prev === 0 ? banners.length - 1 : prev - 1;
      });
    },
    [banners.length]
  );

  // Auto play
  useEffect(() => {
    if (!autoPlay || isPaused || banners.length <= 1) return;

    const timer = setInterval(() => {
      paginate(1);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, interval, paginate, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div
      className="relative w-full aspect-[16/9] max-h-[200px] overflow-hidden rounded-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0"
        >
          <a href={banners[currentIndex].link || '#'} className="block w-full h-full">
            <div
              className={cn(
                'w-full h-full flex flex-col items-center justify-center p-6 text-center',
                banners[currentIndex].bgColor || 'bg-gradient-to-br from-brand-500 to-brand-600'
              )}
            >
              {banners[currentIndex].imageUrl ? (
                <img
                  src={banners[currentIndex].imageUrl}
                  alt={banners[currentIndex].title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
              
              <div className="relative z-10 text-white">
                <h2 className="text-xl font-bold mb-1">{banners[currentIndex].title}</h2>
                {banners[currentIndex].subtitle && (
                  <p className="text-sm opacity-90">{banners[currentIndex].subtitle}</p>
                )}
              </div>
            </div>
          </a>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/70'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};