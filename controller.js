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
      angularAuth0.handleRedirectCallback().then(redirectResult => {
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
                  localStorage.setItem('isLoggedIn', 'true');
                } else {
                  localStorage.setItem('isLoggedIn', 'false');
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
      console.log("is it authenticated..?");
      let cookie = false
      let name = "auth0.is.authenticated=true"
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(';');
      for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          cookie = true
        }
      }

      return cookie
    }

    return {
      login: login,
      handleAuthentication: handleAuthentication,
      isAuthenticated: isAuthenticated,
      getUser: getUser
    }
};

var appController = angular.module('app', ['auth']);

appController.controller('appCtrl', function ($scope, authService) {
  var vm = this;
  vm.auth = authService;
  let checkCount = 0

  // for ng-if in index.ejs
  $scope.isAuthenticated = function() {
    if (authService.isAuthenticated()) {
      return true
    } else {
      return false
    }
  }

  // timeout error is happening after the cookie is added but before the token is added to local storage
  // if we can find a way to stop the timeout error after it happens the first time, this will have to be rewritten to check for the token too
  function cookieCheckTimeout() {
    setTimeout(() => {
      if (authService.isAuthenticated()) {
        location.reload()
        checkCount = 0
        return
      } else {
        checkCount++
      }

      while (checkCount < 16) {
        console.log(checkCount)
        cookieCheckTimeout()
        return
      }

      if (checkCount > 15) {
        alert = $mdDialog.alert()
          .title('Login Error')
          .textContent('If you are experiencing issues logging in, make sure pop up windows are allowed in your browser and reload the page.')
          .ok('Close')

        $mdDialog
          .show(alert)

        return
      }
    }, 3000)
  }

  async function loginAndRefresh() {
    await authService.login()
    cookieCheckTimeout()
  }

  if (!authService.isAuthenticated()) {
      loginAndRefresh()
  }
})