import {provide, OpaqueToken, Provider, Injector} from '@angular/core';

import {Reducer, Middleware} from '@ngrx/store/interfaces';
import {Dispatcher} from '@ngrx/store/dispatcher';
import {Store} from '@ngrx/store/store';
import {StoreBackend, ActionTypes} from '@ngrx/store/store-backend';
import {compose, combineReducers} from '@ngrx/store/utils';

export const PRE_MIDDLEWARE = new OpaqueToken('ngrx/store/pre-middleware');
export const POST_MIDDLEWARE = new OpaqueToken('ngrx/store/post-middleware');
export const RESOLVED_PRE_MIDDLEWARE = new OpaqueToken('ngrx/store/resolved-pre-middleware');
export const RESOLVED_POST_MIDDLEWARE = new OpaqueToken('ngrx/store/resolved-post-middleware');
export const REDUCER = new OpaqueToken('ngrx/store/reducer');
export const INITIAL_STATE = new OpaqueToken('ngrx/store/initial-state');

function dispatcherProvider(dispatcherToken : any) { 
  return provide(dispatcherToken, {
    useFactory() {
      return new Dispatcher<any>();
    }
  });
};

function storeProvider(storeToken : any, dispatcherToken : any, storeBackendToken : any, initialStateToken : any) { 
  return provide(storeToken, {
    deps: [dispatcherToken, storeBackendToken, initialStateToken],
    useFactory(dispatcher: Dispatcher<any>, backend: StoreBackend, initialState: any) {
        return new Store<any>(dispatcher, backend, initialState);
    }
  });
};

function storeBackendProvider(storeBackendToken : any, dispatcherToken : any, reducerToken : any, initialStateToken : any, 
    resolvedPreMiddlewareToken, resolvedPostMiddlewareToken) { 
  return provide(storeBackendToken, {
    deps: [dispatcherToken, reducerToken, initialStateToken, resolvedPreMiddlewareToken, resolvedPostMiddlewareToken],
    useFactory(
      dispatcher: Dispatcher<any>,
      reducer: Reducer<any>,
      initialState: any,
      preMiddleware: Middleware,
      postMiddleware: Middleware
    ) {
      return new StoreBackend(dispatcher, reducer, initialState, preMiddleware, postMiddleware);
    }
  });
}

function resolvedPreMiddlewareProvider(resolvedPreMiddlewareToken : any, preMiddlewareToken : any) {
    return provide(resolvedPreMiddlewareToken, {
        deps: [preMiddlewareToken],
        useFactory(middleware: Middleware[]) {
            return compose(...middleware);
        }
    });
};

function resolvedPostMiddlewareProvider(resolvedPostMiddlewareToken : any, postMiddlewareToken : any) {
    return provide(resolvedPostMiddlewareToken, {
        deps: [postMiddlewareToken],
        useFactory(middleware: Middleware[]) {
            return compose(...middleware);
        }
    });
};

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
  var preMiddlewareToken = prefixToken(PRE_MIDDLEWARE, storeOpaqueToken);
  var postMiddlewareToken = prefixToken(POST_MIDDLEWARE, storeOpaqueToken);
  var resolvedPreMiddlewareToken = prefixToken(RESOLVED_PRE_MIDDLEWARE, storeOpaqueToken);
  var resolvedPostMiddlewareToken = prefixToken(RESOLVED_POST_MIDDLEWARE, storeOpaqueToken);

  return [
    provide(reducerToken, {
      useFactory() {
        if (typeof reducer === 'function') {
          return reducer;
        }

        return combineReducers(reducer);
      }
    }),
    provide(initialStateToken, {
      deps: [ reducerToken ],
      useFactory(reducer) {
        if (initialState === undefined) {
          return reducer(undefined, { type: ActionTypes.INIT });
        }

        return initialState;
      }
    }),
    provide(preMiddlewareToken, { multi: true, useValue: (T => T) }),
    provide(postMiddlewareToken, { multi: true, useValue: (T => T) }),
    dispatcherProvider(dispatcherToken),    
    storeBackendProvider(storeBackendToken, dispatcherToken, reducerToken, initialStateToken, resolvedPreMiddlewareToken, resolvedPostMiddlewareToken),
    storeProvider(storeToken, dispatcherToken, storeBackendToken, initialStateToken),
    resolvedPreMiddlewareProvider(resolvedPreMiddlewareToken, preMiddlewareToken),
    resolvedPostMiddlewareProvider(resolvedPostMiddlewareToken, postMiddlewareToken)
  ];
}

export function usePreMiddleware(storeOpaqueToken? : OpaqueToken, ...middleware: Array<Middleware | Provider>) {
  return provideMiddlewareForToken(prefixToken(PRE_MIDDLEWARE,storeOpaqueToken), middleware);
}

export function usePostMiddleware(storeOpaqueToken? : OpaqueToken, ...middleware: Array<Middleware | Provider>) {
  return provideMiddlewareForToken(prefixToken(POST_MIDDLEWARE,storeOpaqueToken), middleware);
}

export function createMiddleware(
  useFactory: (...deps: any[]) => Middleware, deps?: any[]
): Provider {
  return provide(new OpaqueToken('@ngrx/store middleware'), {
    deps,
    useFactory
  });
}

export function provideMiddlewareForToken(token, _middleware: any[]): Provider[] {
  function isProvider(t: any): t is Provider {
    return t instanceof Provider;
  }

  const provider = provide(token, {
    multi: true,
    deps: [ Injector ],
    useFactory(injector: Injector) {
      const middleware = _middleware.map(m => {
        if (isProvider(m)) {
          return injector.get(m.token);
        }

        return m;
      });

      return compose(...middleware);
    }
  });

  return [ ..._middleware.filter(isProvider), provider ];
}
