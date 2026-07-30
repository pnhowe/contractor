import { Site_Site, Building_Complex } from '../lib/Contractor';
import { dateStr } from '../lib/utils';
import { createPagedListSlice, createAuthThunk } from './sliceFactory';
import type { PageParams, PagedResult } from './sliceFactory';

export interface ComplexListItem {
  id: string;
  description: string;
  type: string;
  state: string;
  created: string;
  updated: string;
}

export type ComplexDetail = Building_Complex;


export const fetchComplexList = createAuthThunk(
  'complexes/fetchList',
  async ( { site, position, count }: { site: string } & PageParams, contractor ) =>
  {
    const filter = site ? new Building_Complex._ListFilter_site( new Site_Site( contractor, site ) ) : undefined;
    const [ listResult, result ] = await Promise.all( [
      contractor.Building_Complex_list( { filter, position, count } ),
      contractor.Building_Complex_get_multi( { filter, position, count } ),
    ] );
    const items = Object.values( result ).map( ( c: any ) => ( {
      id: c.name,
      description: c.description ?? '',
      type: c.type ?? '',
      state: c.state ?? '',
      created: dateStr( c.created ),
      updated: dateStr( c.updated ),
    } ) ) as ComplexListItem[];
    return { items, total: listResult.total } as PagedResult<ComplexListItem>;
  }
);

export const fetchComplex = createAuthThunk(
  'complexes/fetchOne',
  async ( id: string, contractor ) =>
  {
    return await contractor.Building_Complex_get( id );
  }
);

const complexesSlice = createPagedListSlice<ComplexListItem, ComplexDetail>( { name: 'complexes', fetchList: fetchComplexList, fetchOne: fetchComplex } );

export const { invalidate: invalidateComplexes } = complexesSlice.actions;
export default complexesSlice.reducer;
