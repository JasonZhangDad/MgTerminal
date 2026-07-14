export const SESSION_HISTORY_ROW_CLASSNAMES = {
  row: 'w-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-150 cursor-pointer group',
  title: 'text-[13px] truncate min-w-0',
  meta: 'flex items-center gap-2 justify-self-end shrink-0',
  time: 'text-[12px] text-muted-foreground/50 whitespace-nowrap',
  deleteButton: 'opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all duration-150 cursor-pointer shrink-0',
} as const;
