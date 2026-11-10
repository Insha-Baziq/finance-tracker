"use client"
import * as React from "react"
import { CheckIcon, ChevronDownIcon, PlusIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  id?: string
  disabled?: boolean
  className?: string
}
export function Combobox({
  value,
  onChange,
  suggestions,
  placeholder = "Select or type...",
  id,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  React.useEffect(() => {
    if (open) setQuery("")
  }, [open])
  const q = query.trim().toLowerCase()
  const filtered = React.useMemo(
    () => (q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions),
    [suggestions, q]
  )
  const exactMatch = React.useMemo(
    () => q && suggestions.some((s) => s.toLowerCase() === q),
    [suggestions, q]
  )
  const select = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery("")
  }
  const create = () => {
    const v = query.trim()
    if (v) select(v)
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault()
      const match = suggestions.find((s) => s.toLowerCase() === query.trim().toLowerCase())
      if (match) select(match)
      else if (!exactMatch) create()
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-11 w-full justify-between gap-2 px-3 font-normal text-base md:text-sm",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear client"
            className="absolute right-10 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start" onKeyDown={handleKeyDown}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search clients..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.slice(0, 10).map((s) => (
                  <CommandItem key={s} value={s} onSelect={() => select(s)}>
                    <CheckIcon
                      className={cn("size-4", s === value ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{s}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {q && !exactMatch && (
              <CommandGroup>
                <CommandItem value="__create__" onSelect={create}>
                  <PlusIcon className="size-4 opacity-50" />
                  <span className="truncate">
                    Add new client &quot;{query.trim()}&quot;
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length === 0 && !q && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No clients yet
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
