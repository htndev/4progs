let activeTab = doc.querySelector( '[data-role="filter-all"]' ),
    posts     = Array.prototype.slice.call( document.querySelectorAll( '.post' ) );

if ( activeTab !== null ) {
  activeTab.classList.add( 'active' );
}

try {
  $( '.post__body__text' ).collapser( {
    target    : 'next',
    mode      : 'words',
    speed     : 'fast',
    truncate  : 50,
    ellipsis  : '...',
    effect    : 'fade',
    controlBtn: 'showMore',
    showText  : 'More...',
    hideText  : 'Less',
    showClass : 'show-class',
    hideClass : 'hide-class',
    atStart   : 'hide'
  } );
} catch ( e ) {

}

const fadeInBlock = element => {
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

document.body.addEventListener( 'click', function ( e ) {
  if ( e.target.hasAttribute( 'data-role' ) ) {
    let role     = e.target.getAttribute( 'data-role' ),
        link,
        postInfo = getPostInformation( e.target );
    switch ( role ) {
      case 'copy-post-link':
        if ( postInfo !== undefined ) {
          link = `${ location.origin }/post/${ postInfo.groupId }/${ postInfo.postId }`;
          copyStringToClipboard( link );
          M.toast( {
            html: 'Link copied to your clipboard!', draggable: true
          } );
        } else {
          M.toast( {
            html: 'Can\'t copy link to the clipboard! 😞', draggable: true
          } );
        }
        break;
      case 'report':
        generateReport( postInfo, getPostBlock( e.target ) );
        break;
      case 'report-item':
        generatePersonalReport( e.target.getAttribute( 'data-type' ) );
        break;
      case 'filter-all':
        activeTab.classList.remove( 'active' );
        activeTab = e.target;
        activeTab.classList.add( 'active' );
        filter();
        break;
      case 'filter-groups':
        activeTab.classList.remove( 'active' );
        activeTab = e.target;
        activeTab.classList.add( 'active' );
        filter( 'g' );
        break;
      case 'filter-users':
        activeTab.classList.remove( 'active' );
        activeTab = e.target;
        activeTab.classList.add( 'active' );
        filter( 'p' );
        break;
      case 'header-to-post':
        window.location = `${ location.origin }/post/${ postInfo.groupId }/${ postInfo.postId }`;
        break;
      case 'to-top':
        toTop();
        break;
      case 'like':
        let fd = new FormData();
        fd.append( 'postId', +e.target.getAttribute( 'data-post-id' ) );
        fetch( '/like', {
          body  : fd,
          method: 'POST'
        } )
          .then( response => response.text() )
          .then( response => document.querySelector( `span[data-like-place="${ +e.target.getAttribute( 'data-post-id' ) }"]` ).innerText = response );
        break;
      case 'delete-post':
        let formData = new FormData();
        formData.append( 'id', e.target.getAttribute( 'data-post' ) );
        fetch( '/post/delete', {
          method: 'POST',
          body  : formData
        } )
          .then( response => response.text() )
          .then( response => {
            response = JSON.parse( response );
            if ( response.status === 'S' ) {
              fadeInBlock( getPostBlock( e.target ) );
              M.toast( { html: response.text, classes: 'rounded' } );
            } else {
              M.toast( { html: response.text } );
            }
          } );
        break;
    }
  }
} );

function filter ( type = 'all' ) {
  let reducedPosts = posts.filter( element => {
    element.style.display = 'block';
    return type === 'all'
      ? element
      : element.getAttribute( 'data-post-from' ) !== type;
  } );
  reducedPosts.forEach( element => {
    element.style.display = type === 'all'
      ? 'block'
      : 'none';
  } );
}


document.addEventListener( 'scroll', function () {
  let newPosts       = document.querySelector( '[data-role="new-posts"]' ),
      newPostsPinned = document.querySelector( '[data-role="new-posts-pinned"]' );
  if ( newPosts !== null ) {
    let offsetTop = newPosts.offsetTop;
    if ( window.pageYOffset > offsetTop ) {
      newPostsPinned.style.display = 'block';
      toTopBtn.style.display = 'block';
    } else {
      newPostsPinned.style.display = 'none';
      toTopBtn.style.display = 'none';
    }
  }
} );

function toTop () {
  const intervalHeight = 20,
        FPS            = 480,
        TIME           = 2000;
  let height = document.documentElement.scrollTop || document.body.scrollTop;
  let pageOnTop = setInterval( function () {
    if ( window.pageYOffset < 20 ) {
      clearInterval( pageOnTop );
    } else {
      height -= intervalHeight;
      window.scrollTo( 0, height );
      // document.documentElement.scrollTop = height;
      // document.body.scrollTop = height;
    }
  }, TIME / FPS );
}

function getPostBlock ( target ) {
  let block = target.parentElement;
  if ( block === null ) {
    return;
  } else if ( block.classList.contains( 'post' ) ) {
    return block;
  } else {
    return getPostBlock( block );
  }
}

function getPostInformation ( block ) {
  if ( block === null ) {
    return;
  } else if ( block.hasAttribute( 'data-post' ) && block.hasAttribute( 'data-place' ) ) {
    return {
      postId : block.getAttribute( 'data-post' ),
      groupId: block.getAttribute( 'data-place' )
    };
  } else {
    return getPostInformation( block.parentElement );
  }
}