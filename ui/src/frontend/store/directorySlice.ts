import { Directory_Zone, Directory_Entry } from '../lib/Contractor';
import { dateStr } from '../lib/utils';
import { createDetailListSlice, createAuthThunk } from './sliceFactory';

export interface DirectoryZoneListItem {
  id: string;
  name: string;
  fqdn: string;
  parent: string;
  created: string;
  updated: string;
}

export interface DirectoryZoneDetail {
  zone: Directory_Zone | null;
  parentName: string | null;
  entries: Directory_Entry[];
}

export const GLOBAL_ZONE_ID = 'global';

export const fetchDirectoryZoneList = createAuthThunk(
  'directory/fetchList',
  async ( _: void, contractor ) =>
  {
    const result = await contractor.Directory_Zone_get_multi( { filter: undefined } );
    const zones = Object.values( result );
    const nameById = new Map( zones.map( ( zone: any ) => [ zone.id.toString(), zone.name ?? '' ] ) );
    return zones.map( ( zone: any ) => ( {
      id: zone.id.toString(),
      name: zone.name ?? '',
      fqdn: zone.fqdn ?? '',
      parent: zone.parent !== undefined ? ( nameById.get( zone.parent.toString() ) ?? zone.parent.toString() ) : '',
      created: dateStr( zone.created ),
      updated: dateStr( zone.updated ),
    } ) ) as DirectoryZoneListItem[];
  }
);

export const fetchDirectoryZone = createAuthThunk(
  'directory/fetchOne',
  async ( id: string, contractor ) =>
  {
    if ( id === GLOBAL_ZONE_ID )
    {
      const allEntries = await contractor.Directory_Entry_get_multi( { filter: undefined } );
      const entries = Object.values( allEntries ).filter( ( entry ) => entry.zone === undefined );
      return { zone: null, parentName: null, entries } as DirectoryZoneDetail;
    }

    const zoneObj = new Directory_Zone( contractor, parseInt( id ) );
    const [ zone, entries ] = await Promise.all( [
      contractor.Directory_Zone_get( parseInt( id ) ),
      contractor.Directory_Entry_get_multi( { filter: new Directory_Entry._ListFilter_zone( zoneObj ) } ),
    ] );
    const parentName = zone.parent !== undefined ? ( await contractor.Directory_Zone_get( zone.parent.id ) ).name ?? null : null;
    return { zone, parentName, entries: Object.values( entries ) } as DirectoryZoneDetail;
  }
);

const directorySlice = createDetailListSlice<DirectoryZoneListItem, DirectoryZoneDetail>( { name: 'directory', fetchList: fetchDirectoryZoneList, fetchOne: fetchDirectoryZone } );

export const { invalidate: invalidateDirectory } = directorySlice.actions;
export default directorySlice.reducer;
