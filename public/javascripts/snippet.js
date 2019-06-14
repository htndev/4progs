$( 'select' ).formSelect();

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
  let snippetForm = document.forms.snippet,
      deleteBtn   = document.querySelector( '#delete' ),
      copy        = document.querySelector( '#copy' ),
      code        = document.querySelector( '#code' );

  function findSnippet ( element ) {
    if ( element.classList.contains( 'snippet' ) ) {
      return element;
    } else {
      return findSnippet( element.parentElement );
    }
  }

  document.addEventListener( 'click', function ( e ) {
    if ( e.target.hasAttribute( 'data-role' ) ) {
      if ( e.target.getAttribute( 'data-role' ) === 'delete-snippet' ) {
        let formData = new FormData();
        formData.append( 'snippetId', e.target.getAttribute( 'data-snippet' ) );
        let request = new Request( '/s/delete', {
          method: 'POST',
          body  : formData
        } );
        fetch( request )
          .then( response => response.text() )
          .then( response => {
            if ( response === 'true' ) {
              let item = findSnippet( e.target );
              console.log( item );
              fadeIn( item );
              let snippets = document.querySelectorAll( '.snippet' );
              console.log( snippets.length - 1 );
              if ( snippets.length - 1 === 0 ) {
                document.querySelector( '#snippets' ).innerHTML = '<div class="row center-align"><h4 style="color: #d1c4e9">No snippets yet. Wanna get started?</h4></div>';
              }
            }
          } );
      }
    }
  } );

  if ( code !== null ) {
    code = code.innerText;
  }

  if ( copy !== null ) {
    copy.addEventListener( 'click', function () {
      copyStringToClipboard( code );
      M.toast( { html: 'Code copied to your clipboard!' } );
    } );
  }

  if ( deleteBtn !== null ) {
    deleteBtn.addEventListener( 'click', function ( e ) {
      let formData = new FormData();
      formData.append( 'snippetId', location.pathname.split( '/' ).pop() );
      let request = new Request( '/s/delete', {
        method: 'POST',
        body  : formData
      } );
      fetch( request )
        .then( response => response.text() )
        .then( response => response === 'true' ? location.href = '/s' : false );
    } );
  }
  if ( snippetForm !== undefined ) {
    snippetForm.addEventListener( 'submit', function ( e ) {
      e.preventDefault();
      let formData = new FormData( this ),
          request  = new Request( snippetForm.action, {
            method: 'POST',
            body  : formData
          } );
      fetch( request )
        .then( response => response.text() )
        .then( response => {
          try {
            response = JSON.parse( response );
            if ( response.status === 'Failed' ) {
              return Promise.reject( response.text );
            }
          } catch ( e ) {
            location.href = response;
          }
        } )
        .catch( error => M.toast( { html: error } ) );
    } );
  }
} )();