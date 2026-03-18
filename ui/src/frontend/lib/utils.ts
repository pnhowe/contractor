export const dateStr = ( d: any ): string => d instanceof Date ? d.toTimeString() : String( d || '' );

export const configValues = ( obj: any ): [string, string][] =>
  Object.entries( obj || {} ).map( ( [ key, value ] ) => [ key, JSON.stringify( value ) ] as [string, string] );

export const stateColor = ( state: string ): 'default' | 'success' | 'warning' | 'error' | 'info' =>
{
  switch ( state )
  {
    case 'planned': return 'default';
    case 'built': return 'success';
    case 'located': return 'info';

    case 'done': return 'success';
    case 'waiting': return 'info';
    case 'queued': return 'default';
    case 'paused': return 'warning';
    case 'error': return 'error';
    case 'aborted': return 'warning';

    default: return 'default';
  }
};
