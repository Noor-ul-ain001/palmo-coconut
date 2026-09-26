import { AnimatedHeading } from './AnimatedText'

// Carries the can-spin runway marker: the 3D controller measures from this
// section's top to give the can exactly one viewport of spin.
function SectionBreak() {
  return (
    <section
      id="section-break"
      data-can-spin-runway="true"
      className="h-screen max-md:overflow-x-clip max-md:h-[50vh] bg-background flex items-center justify-center w-full"
    >
      <AnimatedHeading className="text180 pb-[6vw] max-md:pb-0! uppercase">
        KEEP SIPPING..
      </AnimatedHeading>
    </section>
  )
}

export default SectionBreak
