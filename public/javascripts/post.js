$( 'textarea#comment_area' ).characterCounter();

let commentForm = document.forms.comment;

let comment = document.querySelector( '#comment_area' );

if ( comment !== undefined || comment !== null ) {
  comment.addEventListener( 'keydown', commentHandler );
}

function commentHandler () {
  if ( this.value.length > +this.getAttribute( 'data-length' ) ) {
    this.value = this.value.substring( 0, +this.getAttribute( 'data-length' ) - 1 );
  }
}


function getCommentElement ( currentElement ) {
  if ( currentElement.classList.contains( 'comment' ) ) {
    return currentElement;
  } else { return getCommentElement( currentElement.parentElement ); }
}

document.addEventListener( 'click', function ( e ) {
  if ( e.target.hasAttribute( 'data-role' ) ) {
    let item = e.target;
    if ( item.getAttribute( 'data-role' ) === 'reply' ) {
      let comm        = getCommentElement( item ),
          username    = comm.querySelector( 'a' ).href.split( '/' ).pop(),
          commentArea = document.querySelector( '#comment_area' );
      commentArea.focus();
      commentArea.value += '@' + username + ', ';
    }
  }
} );

if ( commentForm !== undefined ) {
  commentForm.addEventListener( 'submit', function ( e ) {
    e.preventDefault();
    let formData = new FormData( this );
    let params = location.pathname.split( '/' );
    params.shift();
    params.shift();
    params = JSON.stringify( { postId: +params[ 1 ], place: +params[ 0 ] } );
    formData.append( 'postInfo', params );
    let request = new Request( '/post/comment', {
      method: 'POST',
      body  : formData
    } );
    fetch( request )
      .then( response => response.text() )
      .then( response => {
        response = JSON.parse( response );
        if ( response.status === 'Failed' ) {
          return Promise.reject( response.text );
        } else {
          return response;
        }
      } )
      .then( response => {
        let commentObj = JSON.parse( response.text );
        addComment( commentObj.text );
      } )
      .catch( error => M.toast( { html: error } ) );
  } );
}

function addComment ( text ) {
  let commentsPlace     = document.querySelector( '#comments' )
                                  .querySelector( '.s12' ),
      comment           = document.createElement( 'div' ),
      dateBlock         = document.createElement( 'div' ),
      dateSpan          = document.createElement( 'span' ),
      commentImg        = document.createElement( 'img' ),
      commentImgSrc     = document.querySelector( '#userAvatar' ).src,
      username          = document.querySelector( '#username' ).href
                                  .replace( location.origin, '' )
                                  .split( '/' )
                                  .pop(),
      userTitle         = document.querySelector( '#userTitle' ).innerText,
      commentDataBlock  = document.createElement( 'div' ),
      commentDataA      = document.createElement( 'a' ),
      commentDataHrefH5 = document.createElement( 'h5' ),
      commentTextP      = document.createElement( 'p' ),
      commentText       = document.querySelector( '#comment_area' ),
      replyButton       = document.createElement( 'a' ),
      imgA              = document.createElement( 'a' ),
      posterLink        = '/p/' + username;
  replyButton.classList.add( 'btn-floating', 'btn-small', 'waves-effect', 'waves-light', 'red', 'reply' );
  replyButton.innerHTML = '<i class="material-icons" data-role="reply">reply</i>';
  commentDataBlock.classList.add( 'comment__data' );
  commentDataA.href = posterLink;
  commentDataHrefH5.innerText = userTitle;
  commentDataA.appendChild( commentDataHrefH5 );
  commentDataBlock.appendChild( commentDataA );
  commentTextP.innerHTML = text;
  commentText.value = '';
  commentDataBlock.appendChild( commentTextP );
  commentImg.src = commentImgSrc;
  commentImg.alt = username;
  imgA.href = posterLink;
  imgA.appendChild( commentImg );
  commentImg.classList.add( 'comment__photo' );
  dateBlock.classList.add( 'comment__date' );
  let date = new Date();
  date = `${ ( '0' + date.getHours() ).slice( -2 ) }:${ ( '0' + date.getMinutes() ).slice( -2 ) } ${ ( '0' + date.getDate() ).slice( -2 ) }.${ ( '0' + ( +date.getMonth() + 1 ) ).slice( -2 ) }.${ date.getFullYear() }`;
  dateSpan.innerHTML = date;
  dateBlock.appendChild( dateSpan );
  comment.classList.add( 'comment' );
  comment.appendChild( dateBlock );
  comment.appendChild( imgA );
  comment.appendChild( commentDataBlock );
  comment.appendChild( replyButton );
  commentsPlace.insertBefore( comment, commentsPlace.firstChild );
  document.body.focus();
  commentForm.querySelector( 'label' ).classList.remove( 'active' );
}