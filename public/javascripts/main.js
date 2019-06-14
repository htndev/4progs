let doc      = document,
    toTopBtn = doc.querySelector( '#to-the-top' );

function copyStringToClipboard ( str ) {
  let tmp = document.createElement( 'textarea' );
  tmp.value = str;
  tmp.setAttribute( 'readonly', '' );
  tmp.style = { position: 'absolute', left: '-9999px' };
  document.body.appendChild( tmp );
  tmp.select();
  document.execCommand( 'copy' );
  document.body.removeChild( tmp );
}

$( '.tooltipped' ).tooltip( {
  enterDelay: 1000
} );

$( '.materialboxed' ).materialbox();

$( '#user-options' ).dropdown( {
  constrainWidth: false,
  alignment     : 'right'
} );

let elem = document.querySelector( '.collapsible.expandable' );
if ( elem !== null ) {
  let instance = M.Collapsible.init( elem, {
    accordion: false
  } );
}

$( '.dropdown-trigger' ).dropdown( {
  constrainWidth: false,
  alignment     : 'right'
} );

$( '.sidenav' ).sidenav( {
  draggable: true
} );

( function () {
  let elem   = document.querySelector( '.cumf_bt_form_wrapper' ),
      cblink = document.querySelector( '.cbalink' ),
      script = document.body.querySelector( 'script' );
  try {
    elem.parentNode.removeChild( elem );
    cblink.parentNode.removeChild( cblink );
    script.parentNode.removeChild( script );
  } catch ( e ) {}
} )();
function nodeListToArray ( nodeList ) {
  return Array.prototype.slice.call( nodeList );
}