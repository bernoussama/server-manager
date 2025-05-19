import { cn } from "@/lib/utils";
import { Link, useLocation } from 'react-router-dom';
import {
  Layers,
  Home,
  Settings,
  Terminal,
  Globe,
  Network,
  Server,
  Menu,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string;
    href: string;
    icon: React.ReactNode;
  }[];
}

export function Sidebar({ className, items, ...props }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-40"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
      </Button>

      {/* Sidebar for mobile and desktop */}
      <div
        className={cn(
          "pb-12 border-r bg-background fixed inset-y-0 z-30 transition-transform duration-300 ease-in-out w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
        {...props}
      >
        <div className="space-y-4 py-4">
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
              System Dashboard
            </h2>
          </div>
          <ScrollArea className="h-[calc(100vh-80px)] px-1">
            <div className="space-y-1 p-2">
              {items.map((item, index) => (
                <Link to={item.href} key={index} onClick={() => setIsOpen(false)} className="block">
                  <Button
                    variant={location.pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    {item.icon}
                    <span className="ml-2">{item.title}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

