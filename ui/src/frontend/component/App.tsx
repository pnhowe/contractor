import React from 'react';
import {
  AppBar, Box, Button, Chip, CssBaseline, Dialog, DialogActions,
  DialogContent, DialogTitle, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, TextField, Toolbar, Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import MapIcon from '@mui/icons-material/Map';
import RouterIcon from '@mui/icons-material/Router';
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import StorageIcon from '@mui/icons-material/Storage';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DvrIcon from '@mui/icons-material/Dvr';
import PublicIcon from '@mui/icons-material/Public';
import ReorderIcon from '@mui/icons-material/Reorder';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import TimelineIcon from '@mui/icons-material/Timeline';
import UpdateIcon from '@mui/icons-material/Update';
import SyncIcon from '@mui/icons-material/Sync';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import { BrowserRouter as Router, Route, Link as RouterLink } from 'react-router-dom';
import { contractor, store } from '../store';
import { Site_Site } from '../lib/Contractor';
import { setAuthenticated } from '../store/appSlice';
import { invalidateSites } from '../store/sitesSlice';
import { invalidatePlots } from '../store/plotsSlice';
import { invalidateNetworks } from '../store/networksSlice';
import { invalidateBlueprints } from '../store/blueprintsSlice';
import { invalidatePXE } from '../store/pxeSlice';
import { invalidateFoundations } from '../store/foundationsSlice';
import { invalidateDependencies } from '../store/dependenciesSlice';
import { invalidateStructures } from '../store/structuresSlice';
import { invalidateComplexes } from '../store/complexesSlice';
import { invalidateAddressBlocks } from '../store/addressBlocksSlice';
import { invalidateJobs } from '../store/jobsSlice';
import { invalidateJobLog } from '../store/jobLogSlice';
import { invalidateCartographer } from '../store/cartographerSlice';
import { invalidateTodo } from '../store/todoSlice';
import { invalidateSiteGraph } from '../store/siteGraphSlice';
import Home from './Home';
import Site from './Site';
import Plot from './Plot';
import Network from './Network';
import Foundation from './Foundation';
import Dependency from './Dependency';
import Structure from './Structure';
import Complex from './Complex';
import BluePrint from './BluePrint';
import PXE from './PXE';
import AddressBlock from './AddressBlock';
import Job from './Job';
import Cartographer from './Cartographer';
import JobLog from './JobLog';
import Todo from './Todo';
import SiteGraph from './SiteGraph';
import SiteSelector from './SiteSelector';
import ServerError from './ServerError';

const DRAWER_WIDTH = 240;

const navItems = [
  { to: '/', icon: <HomeIcon />, label: 'Home' },
  { to: '/sites', icon: <BusinessIcon />, label: 'Sites' },
  { to: '/plots', icon: <MapIcon />, label: 'Plots' },
  { to: '/networks', icon: <RouterIcon />, label: 'Networks' },
  { to: '/blueprints', icon: <ImportContactsIcon />, label: 'BluePrints' },
  { to: '/pxes', icon: <ImportContactsIcon />, label: 'PXEs' },
  { to: '/foundations', icon: <StorageIcon />, label: 'Foundations' },
  { to: '/dependancies', icon: <GroupWorkIcon />, label: 'Dependancies' },
  { to: '/structures', icon: <AccountBalanceIcon />, label: 'Structures' },
  { to: '/complexes', icon: <LocationCityIcon />, label: 'Complexes' },
  { to: '/addressblocks', icon: <CompareArrowsIcon />, label: 'Address Blocks' },
  { to: '/jobs', icon: <DvrIcon />, label: 'Jobs' },
  { to: '/cartographer', icon: <PublicIcon />, label: 'Cartographer' },
  { to: '/joblog', icon: <ReorderIcon />, label: 'Job Log' },
  { to: '/todo', icon: <CheckBoxIcon />, label: 'Todo' },
  { to: '/graph', icon: <TimelineIcon />, label: 'Graph' },
];

interface AppState {
  cur_site: string | null;
  loginVisible: boolean;
  username: string;
  password: string;
  leftDrawerVisable: boolean;
  autoUpdate: boolean;
  curJobs: number;
  alerts: number;
  loggedInUser: string | null;
  logoutMenuAnchor: HTMLElement | null;
}

class App extends React.Component<{}, AppState>
{
  state: AppState = {
    cur_site: null,
    loginVisible: false,
    username: '',
    password: '',
    leftDrawerVisable: true,
    autoUpdate: false,
    curJobs: 0,
    alerts: 0,
    loggedInUser: null,
    logoutMenuAnchor: null,
  };

  timerID: any;
  serverErrorRef: React.RefObject<ServerError>;

  constructor( props: {} )
  {
    super( props );
    this.serverErrorRef = React.createRef();
  }

  menuClick = () =>
  {
    this.setState( { leftDrawerVisable: !this.state.leftDrawerVisable } );
  };

  showLogin = () =>
  {
    this.setState( { loginVisible: true } );
  };

  closeLogin = () =>
  {
    this.setState( { loginVisible: false } );
  };

  doLogin = () =>
  {
    contractor.Auth_User_call_login( this.state.username, this.state.password )
      .then( ( token: string ) =>
        {
          contractor.setHeader( 'Auth-Id', this.state.username );
          contractor.setHeader( 'Auth-Token', token );
          localStorage.setItem( 'auth-id', this.state.username );
          localStorage.setItem( 'auth-token', token );
          store.dispatch( setAuthenticated( true ) );
          this.setState( { loginVisible: false, password: '', loggedInUser: this.state.username } );
          this.doUpdate();
        },
        ( err: any ) =>
        {
          alert( 'Error logging in: "' + ( err?.message ?? err ) + '"' );
        } );
  }

  selectSite = ( site: string ) =>
  {
    this.setState( { cur_site: site }, () => { this.doUpdate(); } );
  };

  serverError = ( msg: string, trace: string ) =>
  {
    this.serverErrorRef.current!.show( msg, trace );
  };

  doUpdate = () =>
  {
    store.dispatch( invalidateSites() );
    store.dispatch( invalidatePlots() );
    store.dispatch( invalidateNetworks() );
    store.dispatch( invalidateBlueprints() );
    store.dispatch( invalidatePXE() );
    store.dispatch( invalidateFoundations() );
    store.dispatch( invalidateDependencies() );
    store.dispatch( invalidateStructures() );
    store.dispatch( invalidateComplexes() );
    store.dispatch( invalidateAddressBlocks() );
    store.dispatch( invalidateJobs() );
    store.dispatch( invalidateJobLog() );
    store.dispatch( invalidateCartographer() );
    store.dispatch( invalidateTodo() );
    store.dispatch( invalidateSiteGraph() );

    if ( this.state.cur_site )
    {
      contractor.Foreman_BaseJob_call_jobStats( new Site_Site( contractor, this.state.cur_site ) )
        .then( ( result: any ) =>
          {
            this.setState( { curJobs: result.running ?? 0, alerts: result.error ?? 0 } );
          }
       );
    }
  };

  toggleAutoUpdate = () =>
  {
    var state = !this.state.autoUpdate;
    if( state )
    {
      this.timerID = setInterval( () => this.doUpdate(), 10000 );
    }
    else
    {
      clearInterval( this.timerID );
    }
    this.setState( { autoUpdate: state } );
  };

  showLogoutMenu = ( e: React.MouseEvent<HTMLElement> ) =>
  {
    this.setState( { logoutMenuAnchor: e.currentTarget } );
  };

  closeLogoutMenu = () =>
  {
    this.setState( { logoutMenuAnchor: null } );
  };

  doLogout = () =>
  {
    this.setState( { autoUpdate: false } );
    contractor.clearHeader( 'Auth-Id' );
    contractor.clearHeader( 'Auth-Token' );
    localStorage.removeItem( 'auth-id' );
    localStorage.removeItem( 'auth-token' );
    store.dispatch( setAuthenticated( false ) );
    this.setState( { loggedInUser: null, logoutMenuAnchor: null, cur_site: null } );
    this.doUpdate();
  };

  componentDidMount()
  {
    this.setState( { autoUpdate: false } );
    clearInterval( this.timerID );
    contractor.setServerErrorHandler( this.serverError );
    const savedId = localStorage.getItem( 'auth-id' );
    const savedToken = localStorage.getItem( 'auth-token' );
    if( savedId && savedToken )
    {
      contractor.setHeader( 'Auth-Id', savedId );
      contractor.setHeader( 'Auth-Token', savedToken );
      store.dispatch( setAuthenticated( true ) );
      this.setState( { loggedInUser: savedId } );
    }
  }

  componentWillUnmount()
  {
    clearInterval( this.timerID );
  }

  render()
  {
    return (
<Router>
  <Box sx={{ display: 'flex' }}>
    <CssBaseline />
    <ServerError ref={ this.serverErrorRef } />

    <Dialog open={ this.state.loginVisible } onClose={ this.closeLogin }>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <TextField
          type="text"
          label="Username"
          name="username"
          value={ this.state.username }
          onChange={ (e) => this.setState( { username: e.target.value } ) }
          fullWidth
          margin="dense"
        />
        <TextField
          type="password"
          label="Password"
          name="password"
          value={ this.state.password }
          onChange={ (e) => this.setState( { password: e.target.value } ) }
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={ this.closeLogin }>Close</Button>
        <Button onClick={ this.doLogin } variant="contained">Login</Button>
      </DialogActions>
    </Dialog>

    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton color="inherit" edge="start" onClick={ this.menuClick } sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ mr: 2 }}>Contractor</Typography>
        <SiteSelector key={ this.state.loggedInUser || 'none' } onSiteChange={ this.selectSite } curSite={ this.state.cur_site } />
        <Box sx={{ flexGrow: 1 }} />
        <Chip icon={ <DvrIcon /> } label={ this.state.curJobs } title="Jobs" sx={{ mr: 1, color: 'white', borderColor: 'white' }} variant="outlined" />
        <Chip icon={ <AnnouncementIcon /> } label={ this.state.alerts } title="Alerts" sx={{ mr: 1, color: 'white', borderColor: 'white' }} variant="outlined" />
        <IconButton color={ this.state.autoUpdate ? 'secondary' : 'inherit' } onClick={ this.toggleAutoUpdate } title="Auto Update">
          <UpdateIcon />
        </IconButton>
        <IconButton color="inherit" onClick={ this.doUpdate } title="Refresh">
          <SyncIcon />
        </IconButton>
        { this.state.loggedInUser
          ? <>
              <Chip
                icon={ <AccountCircleIcon /> }
                label={ this.state.loggedInUser }
                onClick={ this.showLogoutMenu }
                sx={{ color: 'white', borderColor: 'white' }}
                variant="outlined"
              />
              <Menu
                anchorEl={ this.state.logoutMenuAnchor }
                open={ Boolean( this.state.logoutMenuAnchor ) }
                onClose={ this.closeLogoutMenu }
              >
                <MenuItem onClick={ this.doLogout }>Logout</MenuItem>
              </Menu>
            </>
          : <IconButton color="inherit" onClick={ this.showLogin } title="Login">
              <AccountCircleIcon />
            </IconButton>
        }
      </Toolbar>
    </AppBar>

    <Drawer
      variant="persistent"
      open={ this.state.leftDrawerVisable }
      sx={{
        width: this.state.leftDrawerVisable ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: 'width 0.2s',
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List dense>
        { navItems.map( ( item ) => (
          <ListItem key={ item.to } disablePadding>
            <ListItemButton component={ RouterLink } to={ item.to }>
              <ListItemIcon>{ item.icon }</ListItemIcon>
              <ListItemText primary={ item.label } />
            </ListItemButton>
          </ListItem>
        ) ) }
      </List>
    </Drawer>

    <Box
      component="main"
      sx={{
        flexGrow: 1,
        minWidth: 0,
        p: 2
      }}
    >
      <Toolbar />
      <Route exact={true} path="/" component={ Home }/>
      <Route path="/site/:id" render={ ( { match } ) => ( <Site id={ match.params.id } /> ) } />
      <Route path="/plot/:id" render={ ( { match } ) => ( <Plot id={ match.params.id } /> ) } />
      <Route path="/blueprint/f/:id" render={ ( { match } ) => ( <BluePrint id={ match.params.id } blueprintType="foundation" /> ) } />
      <Route path="/network/:id" render={ ( { match } ) => ( <Network id={ match.params.id } /> ) } />
      <Route path="/blueprint/s/:id" render={ ( { match } ) => ( <BluePrint id={ match.params.id } blueprintType="structure" /> ) } />
      <Route path="/pxe/:id" render={ ( { match } ) => ( <PXE id={ match.params.id } /> ) } />
      <Route path="/foundation/:id" render={ ( { match } ) => ( <Foundation id={ match.params.id } /> ) } />
      <Route path="/dependency/:id" render={ ( { match } ) => ( <Dependency id={ match.params.id } /> ) } />
      <Route path="/structure/:id" render={ ( { match } ) => ( <Structure id={ match.params.id } /> ) } />
      <Route path="/complex/:id" render={ ( { match } ) => ( <Complex id={ match.params.id } /> ) } />
      <Route path="/addressblock/:id" render={ ( { match } ) => ( <AddressBlock id={ match.params.id } /> ) } />
      <Route path="/job/f/:id" render={ ( { match } ) => ( <Job id={ match.params.id } jobType="foundation" /> ) } />
      <Route path="/job/s/:id" render={ ( { match } ) => ( <Job id={ match.params.id } jobType="structure" /> ) } />
      <Route path="/job/d/:id" render={ ( { match } ) => ( <Job id={ match.params.id } jobType="dependency" /> ) } />
      <Route exact={true} path="/sites" render={ () => ( <Site /> ) } />
      <Route exact={true} path="/plots" render={ () => ( <Plot /> ) } />
      <Route exact={true} path="/networks" render={ () => ( <Network site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/blueprints" render={ () => ( <BluePrint /> ) } />
      <Route exact={true} path="/pxes" render={ () => ( <PXE site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/foundations" render={ () => ( <Foundation site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/dependancies" render={ () => ( <Dependency site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/structures" render={ () => ( <Structure site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/complexes" render={ () => ( <Complex site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/addressblocks" render={ () => ( <AddressBlock site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/jobs" render={ () => ( <Job site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/cartographer" render={ () => ( <Cartographer /> ) } />
      <Route exact={true} path="/joblog" render={ () => ( <JobLog site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/todo" render={ () => ( <Todo site={ this.state.cur_site! } /> ) } />
      <Route exact={true} path="/graph" render={ () => ( <SiteGraph site={ this.state.cur_site! } /> ) } />
    </Box>
  </Box>
</Router>
    );
  }

}

export default App;
