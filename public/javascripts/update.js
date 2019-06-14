$(document).ready(function () {
  $('.tabs').tabs();
});

let settingsGeneral    = document.forms.formGeneral,
    settingsPrivacy    = document.forms.formPrivacy,
    settingsAdditional = document.forms.additionalForm,
    settingsLinks = document.forms.links;

// settingsGeneral.addEventListener('submit', function (e) {
//   e.preventDefault();
//   let formData = new FormData(this);
//   let request  = new Request('/settings/settingGeneral', {
//     method: 'POST',
//     body  : formData
//   });
//   fetch(request)
//     .then(response => response.text())
//     .then(response => {
//       let result = JSON.parse(response);
//       if (result.result === 'Success') {
//         return Promise.reject(result.text);
//       }
//       if (result.result === 'Failed') {
//         return Promise.reject(result.text);
//       }
//       location.href = '/settings';
//     })
//     .catch(error => M.toast({html: error}));
// })

settingsPrivacy.addEventListener('submit', function (e) {
  e.preventDefault();
  let formData = new FormData(this);
  let request  = new Request('/settings/settingPrivacy', {
    method: 'POST',
    body  : formData
  });
  fetch(request)
    .then(response => response.text())
    .then(response => {
      let result = JSON.parse(response);
      if (result.result === 'Success') {
        return Promise.reject(result.text);
      }
      if (result.result === 'Failed') {
        return Promise.reject(result.text);
      }
      // location.href = '/settings';
    })
    .catch(error => M.toast({html: error}));
})

settingsAdditional.addEventListener('submit', function (e) {
  e.preventDefault();
  let formData = new FormData(this);
  let request  = new Request('/settingAdditional', {
    method: 'POST',
    body  : formData
  });
  fetch(request)
    .then(response => response.text())
    .then(response => {
      let result = JSON.parse(response);
      if (result.result === 'Success') {
        return Promise.reject(result.text);
      }
      if (result.result === 'Failed') {
        return Promise.reject(result.text);
      }
       location.href = '/feed';
    })
    .catch(error => M.toast({html: error}));
})

settingsLinks.addEventListener('submit', function (e) {
  e.preventDefault();
  let formData = new FormData(this);
  let request  = new Request('/settings/settingLinks', {
    method: 'POST',
    body  : formData
  });
  fetch(request)
    .then(response => response.text())
    .then(response => {
      let result = JSON.parse(response);
      if (result.result === 'Success') {
        return Promise.reject(result.text);
      }
      if (result.result === 'Failed') {
        return Promise.reject(result.text);
      }
      location.href = '/feed';
    })
    .catch(error => M.toast({html: error}));
})