document.addEventListener( 'click', clickHandler );

function clickHandler ( e ) {
  if ( e.target.hasAttribute( 'data-role' ) ) {
    let type = e.target.getAttribute( 'data-role' );
    switch ( type ) {
      case 'copy-this':
        copyStringToClipboard( e.target.innerText );
        M.toast( { html: 'Username copied to your  clipboard!' } );
        break;
      default:
        return;
    }
  }
}