$( '#admin-abils' ).dropdown( {
  constrainWidth: false,
  alignment     : 'left'
} );

$( '.datepicker' ).datepicker( {
  format : 'yyyy.mm.dd',
  minDate: new Date()
} );

$( '.timepicker' ).timepicker( {
  twelveHour : false,
  vibrate    : true,
  defaultTime: 'now'
} );

const fadeIn = element => {
  let op = 1,
      intv;
  if ( element !== null ) {
    intv = setInterval( () => {
      setTimeout( () => {
        if ( element.parentElement !== null ) {
          if ( op < 0 ) {
            element.parentElement.removeChild( element );
            clearInterval( intv );
          } else {
            op -= .1;
            element.style.opacity = op;
            element.style.transform = `scale(${ op })`;
          }
        }
      }, 0 );
    }, 1000 / 60 );
  }
};

( function () {
  let general = document.forms.general,
      faq     = document.forms.faq;

  if ( faq !== undefined ) {
    faq.addEventListener( 'submit', function ( e ) {
      e.preventDefault();
      let fd = new FormData( this );
      fetch( '/d/faq/new', {
        method: 'POST',
        body  : fd
      } )
        .then( response => response.text() )
        .then( response => {
          response = JSON.parse( response );
          console.log( response );
          let faqsPlace = document.querySelector( '#faq-place' ),
              num       = document.querySelectorAll( '[data-num]' );
          num = num.length > 0 ? +num[ num.length - 1 ].innerText + 1 : 1;
          let tr       = document.createElement( 'tr' ),
              tdNum    = document.createElement( 'td' ),
              tdTitle  = document.createElement( 'td' ),
              tdDesc   = document.createElement( 'td' ),
              tdDate   = document.createElement( 'td' ),
              tdAction = document.createElement( 'td' );
          tdNum.innerText = num;
          tdTitle.innerText = response.title;
          tdDesc.innerText = response.desc;
          let date = new Date();
          tdDate.innerText = `${ ( '0' + date.getHours() ).slice( -2 ) }:${ ( '0' + date.getMinutes() ).slice( -2 ) } ${ ( '0' + date.getDate() ).slice( -2 ) }.${ ( '0' + ( +date.getMonth() + 1 ) ).slice( -2 ) }.${ date.getFullYear() }`;
          tdAction.innerHTML = `<a class="btn-floating waves-effect red"><i data-faq="${ response.id }" data-role="remove-faq" class="material-icons">delete</i></a>`;
          tr.appendChild( tdNum );
          tr.appendChild( tdTitle );
          tr.appendChild( tdDesc );
          tr.appendChild( tdDate );
          tr.appendChild( tdAction );
          faqsPlace.appendChild( tr );
          faq.querySelector( '#title' ).value = '';
          faq.querySelector( 'label[for="title"]' ).classList
             .remove( 'active' );
          faq.querySelector( '#desc' ).value = '';
          faq.querySelector( 'label[for="desc"]' ).classList
             .remove( 'active' );
          document.body.focus();
          M.toast( { html: 'FAQ added successful!' } );
        } );
    } );
  }

  if ( general !== undefined ) {
    general.addEventListener( 'submit', function ( e ) {
      e.preventDefault();
      let formData = new FormData( this ),
          request  = new Request( this.action, {
            body  : formData,
            method: 'POST'
          } );
      fetch( request )
        .then( response => response.text() )
        .then( response => {
          response = JSON.parse( response );
          if ( response.status === 'Failed' ) {
            M.toast( { html: response.text } );
          } else {
            M.toast( { html: response.text, classes: 'rounded' } );
          }
        } );
    } );
  }
} )();

function getTr ( target ) {
  if ( target.tagName === 'TR' ) {
    return target;
  } else { return getTr( target.parentNode ); }
}

document.addEventListener( 'click', function ( e ) {
  if ( e.target.hasAttribute( 'data-role' ) ) {
    // console.log( e.target );
    let role = e.target.getAttribute( 'data-role' );
    switch ( role ) {
      case 'ban':
        let formDataBan = new FormData(),
            idBan       = e.target.getAttribute( 'data-id' );
        formDataBan.append( 'id', idBan );
        let requestBan = new Request( '/d/ban', {
          method: 'POST',
          body  : formDataBan
        } );
        fetch( requestBan )
          .then( response => response.text() )
          .then( response => {
            response = JSON.parse( response );
            if ( response.status === 'Failed' ) {
              M.toast( { html: response.text } );
            } else {
              M.toast( { html: response.text } );
              fadeIn( e.path[ 2 ] );
            }
          } );
        break;
      case 'skip':
        let formData = new FormData(),
            id       = e.target.getAttribute( 'data-id' );
        formData.append( 'id', id );
        let request = new Request( '/d/skip', {
          method: 'POST',
          body  : formData
        } );
        console.log( id );
        fetch( request )
          .then( response => response.text() )
          .then( response => {
            M.toast( { html: response } );
            fadeIn( e.path[ 2 ] );
          } );
        break;
      case 'promote-up':
        let fd = new FormData();
        fd.append( 'id', e.target.getAttribute( 'data-user-id' ) );
        fetch( '/d/promote/up', { body: fd, method: 'POST' } )
          .then( response => response.text() )
          .then( response => {
            console.log( response );
            response = JSON.parse( response );
            if ( response.status === 'S' ) {
              M.toast( {
                html            : response.text,
                completeCallback: setTimeout( () => location.reload(), 300 )
              } );
            } else {
              M.toast( {
                html: response.text
              } );
            }
          } );
        break;
      case 'promote-down':
        let data = new FormData();
        data.append( 'id', e.target.getAttribute( 'data-user-id' ) );
        fetch( '/d/promote/down', { body: data, method: 'POST' } )
          .then( response => response.text() )
          .then( response => {
            console.log( response );
            response = JSON.parse( response );
            if ( response.status === 'S' ) {
              M.toast( {
                html            : response.text,
                completeCallback: setTimeout( () => location.reload(), 300 )
              } );
            } else {
              M.toast( {
                html: response.text
              } );
            }
          } );
        break;
      case 'verify':
        let fData = new FormData();
        fData.append( 'id', +e.target.getAttribute( 'data-id' ) );
        fData.append( 'type', e.target.getAttribute( 'data-type' ) );
        fetch( '/d/verification', {
          method: 'POST',
          body  : fData
        } )
          .then( response => response.text() )
          .then( response => M.toast( {
            html            : response,
            completeCallback: setTimeout( () => location.reload(), 300 )
          } ) );
        break;
      case 'remove-faq':
        let formD = new FormData();
        formD.append( 'id', e.target.getAttribute( 'data-faq' ) );
        fetch( '/d/faq/remove', {
          method: 'POST',
          body  : formD
        } )
          .then( response => response.text() )
          .then( response => {
            response = JSON.parse( response );
            if ( response.status === 'S' ) {
              M.toast( {
                html: response.text
              } );
              fadeIn( getTr( e.target ) );
            } else {
              M.toast( { html: response.text } );
            }
          } );
        break;
    }
  }
} );