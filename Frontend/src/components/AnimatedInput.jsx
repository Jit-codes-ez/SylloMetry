import React, { useId, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * AnimatedInput component with smooth spring-physics floating label animation.
 * Features:
 * - Fluid spring motion for the label
 * - Leading icon & trailing endElement (e.g. password show/hide)
 * - Validation error rendering
 * - Name and native event forwarding for form handlers
 */
export const AnimatedInput = forwardRef(function AnimatedInput(
  {
    value,
    defaultValue = '',
    onChange,
    onValueChange,
    label,
    name,
    placeholder = '',
    disabled = false,
    className = '',
    inputClassName = '',
    labelClassName = '',
    labelBg = 'bg-white',
    icon,
    endElement,
    error,
    type = 'text',
    id,
    ...props
  },
  ref
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const val = isControlled ? value : internalValue;
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => inputRef.current);

  const [isFocused, setIsFocused] = useState(false);
  const hasValue = val !== undefined && val !== null && String(val).trim().length > 0;
  const isFloating = isFocused || hasValue;
  const reactId = useId();
  const inputId = id || name || `animated-input-${reactId.replace(/:/g, '')}`;

  return (
    <div className={cn('w-full pt-1.5', className)}>
      <div className="relative flex items-center">
        {/* Optional Leading Icon */}
        {icon ? (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#850E35]/50 pointer-events-none z-10 flex items-center justify-center transition-colors"
          >
            {icon}
          </span>
        ) : null}

        {/* Input Field */}
        <input
          aria-label={label}
          name={name}
          className={cn(
            'peer w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-[#850E35] outline-none transition-all duration-200 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#850E35]/35',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-[#850E35]/20 focus:border-[#850E35] focus:ring-[#850E35]/15',
            icon ? 'pl-10' : '',
            endElement ? 'pr-11' : '',
            inputClassName
          )}
          disabled={disabled}
          id={inputId}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            if (!isControlled) {
              setInternalValue(nextVal);
            }
            onValueChange?.(nextVal);
            onChange?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          placeholder={isFloating ? placeholder : ''}
          ref={inputRef}
          type={type}
          value={val}
          {...props}
        />

        {/* Optional Trailing End Element (e.g. eye toggle button) */}
        {endElement ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
            {endElement}
          </div>
        ) : null}

        {/* Animated Floating Label with Spring Physics */}
        <motion.label
          initial={false}
          animate={{
            y: isFloating ? -10 : 13,
            x: icon && !isFloating ? 26 : 0,
            scale: isFloating ? 0.82 : 1,
            color: error
              ? '#EF4444'
              : isFloating
              ? '#850E35'
              : 'rgba(133, 14, 53, 0.6)',
          }}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 26,
          }}
          className={cn(
            'pointer-events-none absolute top-0 left-3.5 origin-left rounded px-1 text-xs font-semibold select-none',
            labelBg,
            labelClassName
          )}
          htmlFor={inputId}
          style={{
            zIndex: 2,
          }}
        >
          {label}
        </motion.label>
      </div>

      {/* Validation Error Message */}
      {error ? (
        <p className="mt-1.5 text-[10px] font-medium text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default AnimatedInput;
