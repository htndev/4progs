document.addEventListener( 'DOMContentLoaded', function ( e ) {
  setTimeout( () => {
    let preloaderEl = document.getElementById( 'preloader' );
    preloaderEl.classList.add( 'hidden' );
    preloaderEl.classList.remove( 'visible' );
  }, 300 );
} );