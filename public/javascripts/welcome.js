$(document).ready(function () {
  $('.tabs').tabs();
});

let signInF = document.forms.siF,
    signUpF = document.forms.suF,
    signUpM = document.forms.suM,
    signInM = document.forms.siM;

const signUpHandler = (e, form) => {
  e.preventDefault();
  let formData = new FormData(form);
  let req      = new Request('/signup', {
    method: 'POST',
    body: formData
  });
  fetch(req)
    .then(response => response.text())
    .then(response => {
      let result = JSON.parse(response);
      if (result.result === 'Failed') {
        return Promise.reject(result.text);
      }
      M.toast({html: result.text, classes: 'rounded'});
    })
    .catch(error => M.toast({html: error}))
    .then(() => console.clear());
};

const signInHandler = (e, form) => {
  e.preventDefault();
  let formData = new FormData(form);
  let req      = new Request('/signin', {
    method: 'POST',
    body: formData
  });
  fetch(req)
    .then(response => {
      if (response.url === `${location.origin}/feed`) {
        location.href = '/feed';
        return Promise.reject('Welcome!');
      }
      return response;
    })
    .then(response => response.text())
    .then(response => {
      let result = JSON.parse(response);
      console.log(result);
      if (result.result === 'Failed') {
        return Promise.reject(result.text);
      }
      location.href = '/feed';
    })
    .catch(error => M.toast({html: error}));
  // .then( () => console.clear() );
};
if (signInM !== undefined) {
  signInM.addEventListener('submit', e => signInHandler(e, signInM));
}
if (signInF !== undefined) {
  signInF.addEventListener('submit', e => signInHandler(e, signInF));
}
if (signUpF !== undefined) {
  signUpF.addEventListener('submit', e => signUpHandler(e, signUpF));
}
if (signUpM !== undefined) {
  signUpM.addEventListener('submit', e => signUpHandler(e, signUpM));
}