import { MdOpenInNew, MdInfo, MdWarning, MdCreate } from 'react-icons/md';
import { UI_CONSTANTS } from '../../constants';

interface UpdateCardProps {
  machineId?: string;
  title?: string;
  description?: string;
  iconType?: keyof typeof UI_CONSTANTS.UPDATE_ICON_TYPE;
  onClick?: () => void;
}

const defaultIcon = MdInfo;

const iconMap: Record<string, typeof MdInfo> = {
  [UI_CONSTANTS.UPDATE_ICON_TYPE.INFO]: MdInfo,
  [UI_CONSTANTS.UPDATE_ICON_TYPE.SIGNOFF]: MdCreate,
  [UI_CONSTANTS.UPDATE_ICON_TYPE.THRESHOLD]: MdWarning,
};

const iconColorMap: Record<string, string> = {
  [UI_CONSTANTS.UPDATE_ICON_TYPE.INFO]: 'bg-purple-900',
  [UI_CONSTANTS.UPDATE_ICON_TYPE.THRESHOLD]: 'bg-yellow-500',
  [UI_CONSTANTS.UPDATE_ICON_TYPE.SIGNOFF]: 'bg-red-500',
};

export const UpdateCard = ({
  machineId,
  title,
  description,
  iconType = UI_CONSTANTS.UPDATE_ICON_TYPE.INFO,
  onClick
}: UpdateCardProps) => {
  const IconComponent = iconMap[iconType.toUpperCase()] || defaultIcon;
  const iconColorClass = iconColorMap[iconType] || 'bg-purple-900';
  const heading = machineId ? `Machine ${machineId}` : (title ?? 'Update');
  const bodyCopy = description ?? 'No additional information available.';

  return (
    <div 
      className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        <div className={`w-6 h-6 ${iconColorClass} rounded-full flex items-center justify-center shrink-0 mt-1`}>
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{heading}</h3>
          <p className="text-sm text-gray-600">{bodyCopy}</p>
        </div>
        <MdOpenInNew className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
};