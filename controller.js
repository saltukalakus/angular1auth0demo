var authController = angular.module('auth', ['auth0.auth0', 'ui.router'])

authController.$inject = ['$locationProvider', 'angularAuth0Provider', '$urlRouterProvider'];

authController.config(function(angularAuth0Provider, $locationProvider) {
  let config = {
    client_id: '06CtdSK7dP9uPxDMWLGWXvA0dI6RwcWm',
    domain: 'saltuk-demo.auth0.com',
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'openid',
    cacheLocation: 'localstorage'
  }

  angularAuth0Provider.init(config);

  $locationProvider.hashPrefix('');

  /// Comment out the line below to run the app
  // without HTML5 mode (will use hashes in routes)
  $locationProvider.html5Mode(true);
})

authController.run(function($rootScope, authService) {
  $rootScope.auth = authService
})

authController.factory('authService', authService)

authService.$inject = ['$state', 'angularAuth0', '$timeout']; 

function authService($state, angularAuth0, $timeout) {
    var expiresAt;
  
    function setCookie(cname, cvalue, date) {
      let expires = "expires="+ date.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    function getCookie(cname) {
      let name = cname + "=";
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(';');
      for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    }


    function login() {
      angularAuth0.loginWithRedirect();
    }

    function getUser() {
      let keys = []
      for (var i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      
      for (var i = 0; i < keys.length; i++) {
        if (JSON.stringify(keys[i]).includes('auth0spajs')) {
          let item = JSON.parse(localStorage.getItem(keys[i]))
          let data = {email: item.body.decodedToken.user.email}
          return data
        }
      }
    }

    function handleAuthentication() {
      console.log("handleAuthentication registered..");
      angularAuth0.handleRedirectCallback().then(redirectResult => {
        console.log("handleAuthentication called..");
        angularAuth0.getIdTokenClaims().then(id_token => {
          expiresAt = new Date(id_token.exp * 1000);
          console.log(expiresAt);
          idToken = id_token.__raw;
          angularAuth0.getTokenSilently().then(result => {
            console.log("getTokenSilently: " + result);
            accessToken = result;
            angularAuth0.isAuthenticated().then(
              result => {
                console.log("isAuthenticated: " + result);
                if (result) {
                  setCookie("app.is.authenticated", "true", expiresAt);
                } else {
                  setCookie("app.is.authenticated", "false");
                }
                $state.go('home');
              }
            )
          })
        });
      }).catch(error => {
        console.log(error);
      });
    }

    // function logout() {
    //   // Remove isLoggedIn flag from localStorage
    //   localStorage.removeItem('isLoggedIn');
    //   // Remove tokens and expiry time
    //   accessToken = '';
    //   idToken = '';
    //   expiresAt = 0;

    //   angularAuth0.logout({
    //     returnTo: window.location.origin
    //   });

    //   $state.go('home');
    // }

    function isAuthenticated() {
      if ( getCookie("app.is.authenticated") === "true") {
        return true;
      } else {
        return false;
      }
    }

    return {
      login: login,
      handleAuthentication: handleAuthentication,
      isAuthenticated: isAuthenticated,
      getUser: getUser
    }
};

var appController = angular.module('app', ['auth', 'ui.router'])
.config(config);

config.$inject = [
'$stateProvider'
];

function config(
$stateProvider
) {

$stateProvider
  .state('home', {
    url: '/',
  });
}

appController.controller('appCtrl', function ($scope, authService) {
  // for ng-if in index.ejs
  $scope.isAuthenticated = function() {
    if (authService.isAuthenticated()) {
      return true;
    } else {
      return false;
    }
  }

  if (!authService.isAuthenticated()) {
    if (window.location.pathname === "/callback") {
      authService.handleAuthentication();
    } else {
      authService.login();
    }
  }
})
