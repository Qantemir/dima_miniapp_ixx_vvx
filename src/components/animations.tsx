// Общие компоненты анимаций для проекта
import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

// Анимация появления снизу
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Анимация появления с масштабированием
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

// Анимация появления слева
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

// Анимация появления справа
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

// Общие настройки для анимаций
export const defaultTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // ease-in-out
};

export const fastTransition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
};

export const slowTransition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1],
};

// Компонент для анимации списка с задержкой
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedList = ({ children, className }: AnimatedListProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Компонент для анимации элемента списка
interface AnimatedItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
}

export const AnimatedItem = ({ children, delay = 0, ...props }: AnimatedItemProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ ...defaultTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Компонент для плавного появления страницы
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={defaultTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Компонент для hover эффекта
interface HoverScaleProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  scale?: number;
}

export const HoverScale = ({ children, scale = 1.02, ...props }: HoverScaleProps) => {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={fastTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Компонент для анимации кнопки
interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
}

export const AnimatedButton = ({ children, ...props }: AnimatedButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={fastTransition}
      {...props}
    >
      {children}
    </motion.button>
  );
};

