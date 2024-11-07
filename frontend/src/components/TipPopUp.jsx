import { memo, forwardRef } from 'react';
import { Tooltip } from '@nextui-org/react';

const TipPopup = forwardRef(({ title, children, shortcuts }, ref) => {
  return (
    <Tooltip
      content={
        <div className='flex items-center gap-1 px-2 h-6 text-xs font-medium text-gray-700 rounded-lg border-[0.5px] border-black/5'>
          {title}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
});

export default memo(TipPopup);