//  to be used with the js3db library

document.addEventListener('load', function() { JS3DB.Auth.DOM.onload('allContent'); }, true);
document.getElementById('logoutAction').addEventListener('click', function() { JS3DB.Auth.DOM.logout(); return false; }, true);