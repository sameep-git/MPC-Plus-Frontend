import { ExternalLink, Info, TriangleAlert, SquarePen } from 'lucide-react';
import { UI_CONSTANTS } from '../../constants';

interface UpdateCardProps {
  machineId?: string;
  title?: string;
  description?: string;
  iconType?: keyof typeof UI_CONSTANTS.UPDATE_ICON_TYPE;
  onClick?: () => void;
}

const defaultIcon = Info;

const iconMap: Record<string, typeof Info> = {
  [UI_CONSTANTS.UPDATE_ICON_TYPE.INFO]: Info,
  [UI_CONSTANTS.UPDATE_ICON_TYPE.SIGNOFF]: SquarePen,
  [UI_CONSTANTS.UPDATE_ICON_TYPE.THRESHOLD]: TriangleAlert,
};

const iconColorMap: Record<string, string> = {
  [UI_CONSTANTS.UPDATE_ICON_TYPE.INFO]: 'bg-primary',
  [UI_CONSTANTS.UPDATE_ICON_TYPE.THRESHOLD]: 'bg-yellow-500', // Keep specific warning color or use a warning variant if available
  [UI_CONSTANTS.UPDATE_ICON_TYPE.SIGNOFF]: 'bg-destructive',
};

export const UpdateCard = ({
  machineId,
  title,
  description,
  iconType = UI_CONSTANTS.UPDATE_ICON_TYPE.INFO,
  onClick
}: UpdateCardProps) => {
  const IconComponent = iconMap[iconType.toUpperCase()] || defaultIcon;
  const iconColorClass = iconColorMap[iconType] || 'bg-primary';
  const heading = machineId ? `Machine ${machineId}` : (title ?? 'Update');
  const bodyCopy = description ?? 'No additional information available.';

  return (
    <div
      className="bg-card text-card-foreground border border-border rounded-lg p-4 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        <div className={`w-6 h-6 ${iconColorClass} rounded-full flex items-center justify-center shrink-0 mt-1`}>
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{heading}</h3>
          <p className="text-sm text-muted-foreground">{bodyCopy}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </div>
  );
};