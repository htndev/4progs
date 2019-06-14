$( '.tabs' ).tabs();

const messageForm      = document.forms.message,
      onlineUsersField = document.querySelector( '#online' ),
      allUsersField    = document.querySelector( '#all' );

const fadeIn = element => {
  let op = 1,
      intv;
  if ( element !== null ) {
    intv = setInterval( () => {
      setTimeout( () => {
        if ( op < 0 ) {
          element.parentElement.removeChild( element );
          clearInterval( intv );
        } else {
          op -= .1;
          element.style.opacity = op;
          element.style.transform = `scale(${ op })`;
        }
      }, 0 );
    }, 1000 / 60 );
  }
};

let onlineUsers = nodeListToArray( document.querySelectorAll( '.online' ) );

onlineUsers.forEach( element => {
  onlineUsersField.appendChild( getFriendRoot( element ).cloneNode( true ) );
} );

document.addEventListener( 'click', function ( e ) {
  if ( e.target !== null || e.target !== undefined ) {
    if ( e.target.hasAttribute( 'data-role' ) ) {
      let role = e.target.getAttribute( 'data-role' );
      console.log( role );
      switch ( role ) {
        case 'remove-friend':
          removeFriend( e.target );
          break;
        case 'msg-btn':
          getAppearanceOfFriend( e.target );
          console.log( e.target.getAttribute( 'data-group' ) );
          break;
        case 'add-friend':
          let block = getFriendRoot( e.target );
          // REQUEST
          fadeIn( block );
          break;
        case 'reject-request':
          // Removing from DB
          fadeIn( getFriendRoot( e.target ) );
          break;
        case 'leave-group':
          // Leave from group
          fadeIn( getFriendRoot( e.target ) );
          break;
      }
    }
  }
} );

function removeFriend ( element ) {
  element = getFriendRoot( element );
  /**
   * @DatabaseRequest for removing
   */
  if ( element !== null ) {
    fadeIn( element );
  }
}

function getFriendRoot ( element ) {
  try {
    if ( element.classList.contains( 'friends__body__item' ) ) {
      return element;
    } else { return getFriendRoot( element.parentElement ); }
  } catch ( e ) {}
}

function getAppearanceOfFriend ( element ) {
  let friend = getFriendRoot( element ),
      img    = friend.querySelector( '.friends__item__avatar' ).src,
      title  = friend.querySelector( 'h4' ).innerText,
      link   = messageForm.querySelector( 'a' );
  link.href = `/p/${ element.getAttribute( 'data-group' ) }`;
  messageForm.querySelector( 'h5' ).innerText = title;
  messageForm.querySelector( '.new-message__header__avatar' ).src = img;
}