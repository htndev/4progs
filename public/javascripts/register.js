const generalTab         = document.querySelector( '#generalTab' ),
      additionalTab      = document.querySelector( '#additionalTab' ),
      linksTab           = document.querySelector( '#linksTab' ),
      backGeneral        = document.querySelector( '#backGeneral' ),
      nextAdditinal      = document.querySelector( '#nextAdditional' ),
      nextLinks          = document.querySelector( '#nextLinks' ),
      backToAdditional   = document.querySelector( '#backToAdditional' ),
      submitRegistration = document.querySelector( '#submitRegistration' ),
      username           = document.querySelector( '#username' ),
      registration       = document.forms.registration;

if ( registration !== undefined ) {
  registration.addEventListener( 'submit', function ( e ) {
    e.preventDefault();
    let formData = new FormData( this ),
        req      = new Request( this.action, {
          method: 'POST',
          body  : formData
        } );
    fetch( req )
      .then( response => response.text() )
      .then( response => {
        response = JSON.parse( response );
        if ( typeof response.text === 'object' ) {
          response = response.text;
        }
        if ( response.result === 'Failed' ) {
          M.toast( { html: response.text } );
          return;
        }
        M.toast( { html: response.text, classes: 'rounded' } );
        location.href = '/feed';
      } );
  } );
}

if ( username !== null ) {
  username.addEventListener( 'keypress', function ( e ) {
    this.value = this.value.toLowerCase();
    let ew = e.which;
    if ( ew === 46 ) {
      return true;
    } else if ( ew === 95 ) return true;
    if ( 48 <= ew && ew <= 57 ) {
      return true;
    } else if ( 65 <= ew && ew <= 90 ) {
      return true;
    } else if ( 97 <= ew && ew <= 122 ) {
      return true;
    } else {
      e.preventDefault();
      return false;
    }
  } );
  username.addEventListener( 'input', function ( e ) {
    this.value = this.value.toLowerCase();
  } );
}

if ( backGeneral !== null ) {
  backGeneral.addEventListener( 'click', toGeneral );
}
if ( nextAdditinal !== null ) {
  nextAdditinal.addEventListener( 'click', toAdditional );
}

if ( nextLinks !== null ) {
  nextLinks.addEventListener( 'click', toLinks );
}
// nextLinks.addEventListener( 'click', toLinks );
if ( backToAdditional !== null ) {
  backToAdditional.addEventListener( 'click', toAdditional );
}
// backToAdditional.addEventListener( 'click', toAdditional );

$( '.tabs' ).tabs();


$( 'select' ).formSelect();

if ( document.querySelector( 'textarea#bio' ) !== null ) {
  $( 'textarea#bio, input#user-status' ).characterCounter();
  M.textareaAutoResize( $( '#bio' ) );
}

function toGeneral () {
  let evt = document.createEvent( 'MouseEvents' );
  evt.initMouseEvent( 'click', true, true, window,
    0, 0, 0, 0, 0, false, false, false, false, 0, null );
  generalTab.dispatchEvent( evt ); // element for click
}

function toAdditional () {
  let evt = document.createEvent( 'MouseEvents' );
  evt.initMouseEvent( 'click', true, true, window,
    0, 0, 0, 0, 0, false, false, false, false, 0, null );
  additionalTab.dispatchEvent( evt ); // element for click
}

function toLinks () {
  let evt = document.createEvent( 'MouseEvents' );
  evt.initMouseEvent( 'click', true, true, window,
    0, 0, 0, 0, 0, false, false, false, false, 0, null );
  linksTab.dispatchEvent( evt ); // element for click
}

