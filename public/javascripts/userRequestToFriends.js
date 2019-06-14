$( document ).ready( function () {
  $( '.tabs' ).tabs();
} );

let groupAdding = document.querySelector( '#add_to_friends' );

if ( groupAdding !== null ) {
  groupAdding.addEventListener( 'click', function ( e ) {
    e.preventDefault();
    let item = groupAdding.querySelector( 'i' );
    let formData = new FormData();
    let userID = location.pathname.split( '/' ).pop();
    formData.append( 'user', userID );
    console.log( userID );
    let request = new Request( '/p/new/addFriend', {
      method: 'POST',
      body  : formData
    } );
    fetch( request )
      .then( response => response.text() )
      .then( response => {
        let result = JSON.parse( response );
        if ( result.result === 'Success' ) {
          return Promise.reject( result.text );
        }
        if ( result.result === 'Failed' ) {
          return Promise.reject( result.text );
        }

      } )
      .catch( error => M.toast( { html: error } ) );
  } );
}