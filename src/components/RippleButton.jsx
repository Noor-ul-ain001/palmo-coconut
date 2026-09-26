import { useRef } from 'react'

// Circular control whose fill grows from the centre on hover — the scale is
// a plain CSS transition so it survives without JS motion.
function RippleButton({ children, className = '', bgColor = 'var(--beige)', ...rest }) {
  const rippleRef = useRef(null)

  return (
    <button
      type="button"
      className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full duration-500 ease-in-out ${className}`}
      onPointerEnter={() => {
        if (rippleRef.current) {
          rippleRef.current.style.transform = 'translate(-50%, -50%) scale(1)'
        }
      }}
      onPointerLeave={() => {
        if (rippleRef.current) {
          rippleRef.current.style.transform = 'translate(-50%, -50%) scale(0)'
        }
      }}
      {...rest}
    >
      <span
        ref={rippleRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square rounded-full"
        style={{
          width: '250%',
          transform: 'translate(-50%, -50%) scale(0)',
          transition: 'transform 0.5s ease',
          backgroundColor: bgColor,
        }}
      />
      <span className="relative z-2 flex items-center justify-center">{children}</span>
    </button>
  )
}

export default RippleButton
