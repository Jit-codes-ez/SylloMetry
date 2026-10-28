import React, { memo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

const motionElements = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  span: motion.span,
};

const staggerTimings = {
  text: 0.06,
  word: 0.05,
  character: 0.03,
  line: 0.06,
};

const defaultContainerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const defaultItemVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

const defaultItemAnimationVariants = {
  fadeIn: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
        },
      },
      exit: {
        opacity: 0,
        y: 20,
        transition: { duration: 0.3 },
      },
    },
  },
  blurIn: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)' },
      show: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: {
          duration: 0.3,
        },
      },
      exit: {
        opacity: 0,
        filter: 'blur(4px)',
        transition: { duration: 0.3 },
      },
    },
  },
  blurInUp: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)', y: 20 },
      show: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: {
          y: { duration: 0.3 },
          opacity: { duration: 0.4 },
          filter: { duration: 0.3 },
        },
      },
      exit: {
        opacity: 0,
        filter: 'blur(4px)',
        y: 20,
        transition: {
          y: { duration: 0.3 },
          opacity: { duration: 0.4 },
          filter: { duration: 0.3 },
        },
      },
    },
  },
  blurInDown: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)', y: -20 },
      show: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: {
          y: { duration: 0.3 },
          opacity: { duration: 0.4 },
          filter: { duration: 0.3 },
        },
      },
    },
  },
  slideUp: {
    container: defaultContainerVariants,
    item: {
      hidden: { y: 20, opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 0.3,
        },
      },
      exit: {
        y: -20,
        opacity: 0,
        transition: {
          duration: 0.3,
        },
      },
    },
  },
  slideDown: {
    container: defaultContainerVariants,
    item: {
      hidden: { y: -20, opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.3 },
      },
      exit: {
        y: 20,
        opacity: 0,
        transition: { duration: 0.3 },
      },
    },
  },
  slideLeft: {
    container: defaultContainerVariants,
    item: {
      hidden: { x: 20, opacity: 0 },
      show: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.3 },
      },
      exit: {
        x: -20,
        opacity: 0,
        transition: { duration: 0.3 },
      },
    },
  },
  slideRight: {
    container: defaultContainerVariants,
    item: {
      hidden: { x: -20, opacity: 0 },
      show: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.3 },
      },
      exit: {
        x: 20,
        opacity: 0,
        transition: { duration: 0.3 },
      },
    },
  },
  scaleUp: {
    container: defaultContainerVariants,
    item: {
      hidden: { scale: 0.5, opacity: 0 },
      show: {
        scale: 1,
        opacity: 1,
        transition: {
          duration: 0.3,
          scale: {
            type: 'spring',
            damping: 15,
            stiffness: 300,
          },
        },
      },
      exit: {
        scale: 0.5,
        opacity: 0,
        transition: { duration: 0.3 },
      },
    },
  },
  scaleDown: {
    container: defaultContainerVariants,
    item: {
      hidden: { scale: 1.5, opacity: 0 },
      show: {
        scale: 1,
        opacity: 1,
        transition: {
          duration: 0.3,
          scale: {
            type: 'spring',
            damping: 15,
            stiffness: 300,
          },
        },
      },
      exit: {
        scale: 1.5,
        opacity: 0,
        transition: { duration: 0.3 },
      },
    },
  },
};

const TextAnimateBase = ({
  children,
  delay = 0,
  duration = 0.3,
  variants,
  className,
  segmentClassName,
  as: Component = 'p',
  startOnView = true,
  once = true,
  by = 'word',
  animation = 'fadeIn',
  accessible = true,
  ...props
}) => {
  const MotionComponent = motionElements[Component] || motion[Component] || motion.p;

  let text = typeof children === 'string' ? children : '';
  let extractedClassName = '';

  if (!text && React.isValidElement(children) && typeof children.props?.children === 'string') {
    text = children.props.children;
    extractedClassName = children.props.className || '';
  }

  let segments = [];
  if (text) {
    switch (by) {
      case 'word':
        segments = text.split(/(\s+)/);
        break;
      case 'character':
        segments = text.split('');
        break;
      case 'line':
        segments = text.split('\n');
        break;
      case 'text':
      default:
        segments = [text];
        break;
    }
  } else {
    segments = [children];
  }

  const finalVariants = variants
    ? {
        container: {
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              opacity: { duration: 0.01, delay },
              delayChildren: delay,
              staggerChildren: duration / (segments.length || 1),
            },
          },
          exit: {
            opacity: 0,
            transition: {
              staggerChildren: duration / (segments.length || 1),
              staggerDirection: -1,
            },
          },
        },
        item: variants,
      }
    : animation && defaultItemAnimationVariants[animation]
      ? {
          container: {
            ...defaultItemAnimationVariants[animation].container,
            show: {
              ...defaultItemAnimationVariants[animation].container.show,
              transition: {
                delayChildren: delay,
                staggerChildren: duration / (segments.length || 1),
              },
            },
            exit: {
              ...defaultItemAnimationVariants[animation].container.exit,
              transition: {
                staggerChildren: duration / (segments.length || 1),
                staggerDirection: -1,
              },
            },
          },
          item: defaultItemAnimationVariants[animation].item,
        }
      : { container: defaultContainerVariants, item: defaultItemVariants };

  return (
    <AnimatePresence mode="popLayout">
      <MotionComponent
        variants={finalVariants.container}
        initial="hidden"
        whileInView={startOnView ? 'show' : undefined}
        animate={startOnView ? undefined : 'show'}
        exit="exit"
        className={cn('whitespace-pre-wrap', className)}
        viewport={{ once }}
        aria-label={accessible && typeof children === 'string' ? children : undefined}
        {...props}
      >
        {accessible && typeof children === 'string' && <span className="sr-only">{children}</span>}
        {segments.map((segment, i) => {
          const isSpace = /^\s+$/.test(segment);
          if (isSpace && by === 'word') {
            return (
              <span key={`${by}-space-${i}`} className="inline">
                {segment}
              </span>
            );
          }

          return (
            <motion.span
              key={`${by}-${segment}-${i}`}
              variants={finalVariants.item}
              custom={i * (staggerTimings[by] || 0.03)}
              className={cn(
                by === 'line' ? 'block' : 'inline-block',
                by === 'character' ? 'whitespace-pre' : '',
                extractedClassName,
                segmentClassName
              )}
              aria-hidden={accessible ? true : undefined}
            >
              {segment}
            </motion.span>
          );
        })}
      </MotionComponent>
    </AnimatePresence>
  );
};

export const TextAnimate = memo(TextAnimateBase);
export const TextAnimation = memo(TextAnimateBase);
export default TextAnimate;
