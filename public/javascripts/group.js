$( document ).ready( function () {
  $( '.tabs' ).tabs();
} );

let groupAdding = document.querySelector( '#add_to_friends' );

if ( groupAdding !== null ) {
  document.addEventListener( 'click', function ( e ) {
    // e.preventDefault();
    if ( e.target.hasAttribute( 'data-role' ) ) {
      if ( e.target.getAttribute( 'data-role' ) === 'addNewMember' ) {
        addingHandler( e );
      }
    }
  } );
}

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

function addingHandler ( e ) {
  e.preventDefault();
  let item = groupAdding.querySelector( 'i' );
  let formData = new FormData();
  let groupId = item.getAttribute( 'data-place-id' );
  formData.append( 'group', groupId );
  let request = new Request( '/g/member/add', {
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
}

let updateForm = document.forms.updateGroup;

if ( updateForm !== undefined ) {
  updateForm.addEventListener( 'submit', function ( e ) {
    e.preventDefault();
    let formData = new FormData( this );
    formData.append( 'groupName', location.pathname.split( '/' )[ 2 ] );
    let request = new Request( this.action, {
      method: 'POST', body: formData
    } );
    fetch( request )
      .then( response => response.text() )
      .then( response => M.toast( { html: response } ) );
  } );
}

document.addEventListener( 'click', function ( e ) {
  if ( e.target.hasAttribute( 'data-role' ) ) {
    if ( e.target.getAttribute( 'data-role' ) === 'remove-member' ) {
      let id = +e.target.getAttribute( 'data-membership' ),
          fd = new FormData();
      fd.append( 'membershipId', id );
      fd.append( 'groupName', location.pathname.split( '/' )[ 2 ] );
      let request = new Request( '/g/member/remove', {
        method: 'POST',
        body  : fd
      } );
      fetch( request )
        .then( response => response.text() )
        .then( response => M.toast( {
          html: response, completeCallback: fadeIn( findFriend( e.target ) )
        } ) );
    }
  }
} );

function findFriend ( item ) {
  if ( item.classList.contains( 'friends__body__item' ) ) {
    return item;
  } else {
    return findFriend( item.parentElement );
  }
}