import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface SectionHeadingProps {
  label?: string
  title: string
  description?: string
  align?: "left" | "center"
  dark?: boolean
}

export function SectionHeading({ label, title, description, align = "left", dark = false }: SectionHeadingProps) {
  const textColor = dark ? "text-light" : "text-ink"
  const mutedColor = dark ? "text-light/60" : "text-muted"
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left"

  return (
    <div className={cn("flex flex-col gap-3", alignClass)}>
      {label && (
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className={cn("text-xs uppercase tracking-widest font-sans font-medium", mutedColor)}
        >
          {label}
        </motion.span>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={cn("font-serif text-3xl md:text-4xl lg:text-5xl leading-tight", textColor)}
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={cn("text-base max-w-xl", mutedColor)}
        >
          {description}
        </motion.p>
      )}
    </div>
  )
}
