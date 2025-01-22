import { Button } from "@/components/ui/button";
import { 
  FileCode, 
  FileJson, 
  FileText, 
  Image, 
  Video, 
  FilePdf, 
  Files 
} from "lucide-react";

interface ContentTypeButtonsProps {
  counts: {
    js: number;
    json: number;
    text: number;
    images: number;
    videos: number;
    pdfs: number;
    others: number;
  };
  onFilter: (type: string) => void;
  activeFilter: string | null;
}

export const ContentTypeButtons = ({ 
  counts, 
  onFilter, 
  activeFilter 
}: ContentTypeButtonsProps) => {
  const buttons = [
    { type: "js", icon: FileCode, label: "JavaScript", count: counts.js },
    { type: "json", icon: FileJson, label: "JSON", count: counts.json },
    { type: "text", icon: FileText, label: "Text", count: counts.text },
    { type: "images", icon: Image, label: "Images", count: counts.images },
    { type: "videos", icon: Video, label: "Videos", count: counts.videos },
    { type: "pdfs", icon: FilePdf, label: "PDFs", count: counts.pdfs },
    { type: "others", icon: Files, label: "Others", count: counts.others },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(({ type, icon: Icon, label, count }) => (
        <Button
          key={type}
          variant={activeFilter === type ? "default" : "outline"}
          className="flex items-center space-x-2"
          onClick={() => onFilter(type)}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-terminal-bg text-terminal-text text-xs">
            {count}
          </span>
        </Button>
      ))}
    </div>
  );
};