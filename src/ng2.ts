import {OpaqueToken, Provider, Injector} from '@angular/core';

import {Reducer} from './interfaces';
import {Dispatcher} from './dispatcher';
import {Store} from './store';
import {StoreBackend, ActionTypes} from './store-backend';
import {compose, combineReducers} from './utils';

export const REDUCER = new OpaqueToken('ngrx/store/reducer');
export const INITIAL_STATE = new OpaqueToken('ngrx/store/initial-state');

function dispatcherProvider(dispatcherToken : any) { 
  return {provide: dispatcherToken, 
    useFactory : () => {
      return new Dispatcher<any>();
    }
  };
};

function storeProvider(storeToken : any, dispatcherToken : any, storeBackendToken : any, initialStateToken : any) { 
  return {provide: storeToken, 
    deps: [dispatcherToken, storeBackendToken, initialStateToken],
    useFactory : (dispatcher: Dispatcher<any>, backend: StoreBackend, initialState: any) => {
        return new Store<any>(dispatcher, backend, initialState);
    }
  };
};

function storeBackendProvider(storeBackendToken : any, dispatcherToken : any, reducerToken : any, initialStateToken : any) { 
  return {provide : storeBackendToken,
    deps: [dispatcherToken, reducerToken, initialStateToken],
    useFactory : (
      dispatcher: Dispatcher<any>,
      reducer: Reducer<any>,
      initialState: any
    ) => {
      return new StoreBackend(dispatcher, reducer, initialState);
    }
  };
}

function prefixToken(token : OpaqueToken, prefixOpaqueToken : OpaqueToken) : OpaqueToken {
    if(prefixOpaqueToken) {
        var storeOpaqueTokenString = prefixOpaqueToken.toString();
        var tokenString = token.toString();
        var resultTokenString = storeOpaqueTokenString+"-"+tokenString;
        return new OpaqueToken(resultTokenString);
    } else {
        return token;
    }
}

export function provideStore(reducer: any, initialState?: any, storeOpaqueToken? : OpaqueToken) {
  var storeToken = storeOpaqueToken ? storeOpaqueToken : Store;
  var dispatchTokenString = storeOpaqueToken.toString()+"-Dispatcher";  
  var dispatcherToken = storeOpaqueToken ? new OpaqueToken(dispatchTokenString) : Dispatcher;
  var storeTokenString = storeOpaqueToken.toString()+"-StoreBackend";
  var storeBackendToken = storeOpaqueToken ? new OpaqueToken(storeTokenString) : StoreBackend;
  
  var reducerToken = prefixToken(REDUCER, storeOpaqueToken); 
  var initialStateToken = prefixToken(INITIAL_STATE, storeOpaqueToken);

  return [
    {provide: reducerToken, 
      useFactory :() => {
        if (typeof reducer === 'function') {
          return reducer;
        }

        return combineReducers(reducer);
      }
    },
    {provide :initialStateToken, 
      deps: [ reducerToken ],
      useFactory(reducer) {
        if (initialState === undefined) {
          return reducer(undefined, { type: ActionTypes.INIT });
        }

        return initialState;
      }
    },
    dispatcherProvider(dispatcherToken),    
    storeBackendProvider(storeBackendToken, dispatcherToken, reducerToken, initialStateToken),
    storeProvider(storeToken, dispatcherToken, storeBackendToken, initialStateToken)
  ];
}

