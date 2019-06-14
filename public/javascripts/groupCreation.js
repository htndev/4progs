let groupCreation = document.forms.new_group;
groupCreation.addEventListener( 'submit', function ( e ) {
  e.preventDefault();
  let formData = new FormData( this );
  let request = new Request( '/g/new', {
    method: 'POST',
    body  : formData
  } );
  fetch( request )
    .then( response => response.text() )
    .then( response => {
      let result = JSON.parse( response );
      if ( result.result === 'Failed' ) {
        return Promise.reject( result.text );
      }
      M.toast( { html: result.text } );
      location.href = '/g/' + result.gID;
    } )
    .catch( error => M.toast( { html: error } ) );
} );