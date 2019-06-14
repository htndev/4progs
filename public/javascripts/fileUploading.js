let fileForm               = document.forms.imgUploading,
    uploadingPhotosArray   = [],
    uploadingSnippetsArray = [],
    documentsPlace         = document.querySelector( '#new-post__documents' ),
    newPostUser            = document.forms.newPostUser,
    newPostGroup           = document.forms.newPostGroup,
    newSnippet             = document.forms.snippetForm,
    items                  = document.querySelectorAll( 'ul[id^=post-popup-]' ),
    maxId                  = -1;

$( '#attach-to-post' ).dropdown( {
  constrainWidth: false,
  alignment     : 'left'
} );

if ( document.querySelector( '#newPost' ) !== null ) {
  M.textareaAutoResize( $( '#newPost' ) );
}

$( '#upload-img' ).modal();
$( '#upload-file' ).modal();
$( '#upload-snippet' ).modal();

items.forEach( item => {
  if ( +item.id.split( '-' ).pop() > maxId ) {
    maxId = +item.id.split( '-' ).pop();
  }
  if ( maxId === -1 ) maxId = 1;
} );

if ( newPostGroup !== undefined ) {
  newPostGroup.addEventListener( 'submit', function ( e ) {
    e.preventDefault();
    let formData = new FormData( this );
    formData.append( 'photosUploaded', JSON.stringify( uploadingPhotosArray ) );
    formData.append( 'snippetsUploaded', JSON.stringify( uploadingSnippetsArray ) );
    formData.append( 'groupId', location.href.split( '/' ).pop() );
    let request = new Request( '/post/g/newPost', {
      method: 'POST',
      body  : formData
    } );
    fetch( request )
      .then( response => response.text() )
      .then( response => {
        response = JSON.parse( response );
        let wrapper   = document.createDocumentFragment(),
            post      = document.createElement( 'div' ),
            header    = createPostHeader( response ),
            body      = createPostBody( response ),
            footer    = createPostFooter( response ),
            postPlace = document.querySelector( '#posts' );
        post.classList.add( 'post' );
        post.dataset.postFrom = response.type;
        post.dataset.post = response.postId;
        post.dataset.place = response.type === 'u' ? response.id : response.group.groupName;
        wrapper.appendChild( header );
        wrapper.appendChild( body );
        wrapper.appendChild( footer );
        post.appendChild( wrapper );
        if ( !!!document.querySelectorAll( '.post' ).length ) {
          postPlace.innerHTML = '';
        }
        postPlace.insertBefore( post, postPlace.firstChild );
        $( '.dropdown-trigger' ).dropdown( {
          constrainWidth: false,
          alignment     : 'right'
        } );
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
        $( '.materialboxed' ).materialbox();
        document.querySelector( '#newPost' ).value = '';
        uploadingPhotosArray = uploadingSnippetsArray = [];
        documentsPlace.innerHTML = '';
      } );
  } );
}

if ( newPostUser !== undefined ) {
  newPostUser.addEventListener( 'submit', function ( e ) {
    e.preventDefault();
    let formData = new FormData( this );
    formData.append( 'photosUploaded', JSON.stringify( uploadingPhotosArray ) );
    formData.append( 'snippetsUploaded', JSON.stringify( uploadingSnippetsArray ) );

    let request = new Request( '/post/u/newPost', {
      method: 'POST',
      body  : formData
    } );

    fetch( request )
      .then( response => response.text() )
      .then( response => {
        response = JSON.parse( response );
        console.log( response );
        let wrapper   = document.createDocumentFragment(),
            post      = document.createElement( 'div' ),
            header    = createPostHeader( response ),
            body      = createPostBody( response ),
            footer    = createPostFooter( response ),
            postPlace = document.querySelector( '#posts' );
        post.classList.add( 'post' );
        post.dataset.postFrom = 'user';
        post.dataset.post = response.postId;
        post.dataset.place = response.id;
        wrapper.appendChild( header );
        wrapper.appendChild( body );
        wrapper.appendChild( footer );
        post.appendChild( wrapper );
        if ( !!!document.querySelectorAll( '.post' ).length ) {
          postPlace.innerHTML = '';
        }
        postPlace.insertBefore( post, postPlace.firstChild );
        $( '.dropdown-trigger' ).dropdown( {
          constrainWidth: false,
          alignment     : 'right'
        } );
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
        $( '.materialboxed' ).materialbox();
        document.querySelector( '#newPost' ).value = '';
        uploadingPhotosArray = uploadingSnippetsArray = [];
        documentsPlace.innerHTML = '';
      } );
  } );
}

function createPostHeader ( post ) {
  let header    = document.createElement( 'div' ),
      target    = `post-popup-${ maxId + 1 }`,
      userTitle = document.querySelector( '#user-title' ).innerText;
  header.classList.add( 'post__header' );
  header.dataset.role = 'header-to-post';
  let dropDown = document.createElement( 'a' );
  dropDown.classList.add( 'dropdown-trigger', 'btn', 'waves-circle', 'btn-floating', 'waves-effect', 'waves-red' );
  dropDown.dataset.target = target;
  let iconHoriz = document.createElement( 'i' );
  iconHoriz.classList.add( 'material-icons' );
  iconHoriz.innerText = 'more_horiz';
  dropDown.appendChild( iconHoriz );
  let operationList = document.createElement( 'ul' );
  operationList.id = target;
  operationList.classList.add( 'dropdown-content' );
  operationList.tabIndex = 0;
  let copyLi   = document.createElement( 'li' ),
      reportLi = document.createElement( 'li' ),
      deleteLi = document.createElement( 'li' );
  let reportA = document.createElement( 'a' ),
      copyA   = document.createElement( 'a' ),
      deleteA = document.createElement( 'a' );
  copyLi.tabIndex = 0;
  reportLi.tabIndex = 0;
  deleteLi.tabIndex = 0;
  copyA.classList.add( 'waves-effect', 'waves-red' );
  reportA.classList.add( 'waves-effect', 'waves-red', 'modal-trigger' );
  deleteA.classList.add( 'waves-effect', 'waves-red' );
  copyA.dataset.role = 'copy-post-link';
  reportA.dataset.role = 'report';
  deleteA.dataset.role = 'delete-post';
  deleteA.dataset.post = post.postId;
  reportA.dataset.target = 'report';
  let copyI   = document.createElement( 'i' ),
      reportI = document.createElement( 'i' ),
      deleteI = document.createElement( 'i' );
  copyI.classList.add( 'material-icons' );
  copyI.innerText = 'insert_link';
  reportI.classList.add( 'material-icons' );
  reportI.innerText = 'report';
  deleteI.classList.add( 'material-icons' );
  deleteI.innerText = 'delete_forever';
  reportA.appendChild( reportI );
  reportA.innerHTML += 'Report';
  copyA.appendChild( copyI );
  copyA.innerHTML += 'Copy Link';
  deleteA.appendChild( deleteI );
  deleteA.innerHTML += 'Delete';
  copyLi.appendChild( copyA );
  reportLi.appendChild( reportA );
  deleteLi.appendChild( deleteA );
  operationList.appendChild( copyLi );
  operationList.appendChild( deleteLi );
  operationList.appendChild( reportLi );
  let imgA = document.createElement( 'a' ),
      img  = document.createElement( 'img' );
  imgA.href = location.href;
  img.src = document.querySelector( '#avatar' ).src;
  img.alt = userTitle;
  img.classList.add( 'post__header__publisher-img' );
  imgA.appendChild( img );
  let infoBLock = document.createElement( 'div' ),
      userLink  = document.createElement( 'a' ),
      time      = document.createElement( 'p' );
  infoBLock.classList.add( 'post__header__info' );
  userLink.href = location.href;
  userLink.innerHTML = `<h4 class="post__header__title">${ userTitle }</h4>`;
  let currentTime = new Date();
  time.innerText = `${ currentTime.getHours() }:${ currentTime.getMinutes() } ${ currentTime.getDate() }.${ currentTime.getMonth() }.${ currentTime.getFullYear() }`;
  infoBLock.appendChild( userLink );
  infoBLock.appendChild( time );
  header.appendChild( dropDown );
  header.appendChild( operationList );
  header.appendChild( imgA );
  header.appendChild( infoBLock );
  return header;
}

function createPostBody ( post ) {
  let body = document.createElement( 'div' );
  body.classList.add( 'post__body' );
  let paragraph = document.createElement( 'p' );
  paragraph.classList.add( 'post__body__text', 'hide-class' );
  paragraph.innerHTML = post.text;
  body.appendChild( paragraph );
  if ( post.photosArray !== undefined ) {
    let photos       = document.createElement( 'div' ),
        photoWrapper = document.createDocumentFragment();
    photos.classList.add( 'post__body__photos' );
    post.photosArray.forEach( photo => {
      let img = document.createElement( 'img' );
      img.src = photo.path;
      img.alt = `${ post.id }'s photo`;
      img.classList.add( 'materialboxed' );
      photoWrapper.appendChild( img );
    } );
    photos.appendChild( photoWrapper );
    body.appendChild( photos );
  }
  if ( post.snippetsArray !== undefined ) {
    let snippetWrapper = document.createDocumentFragment(),
        snippets       = document.createElement( 'div' );
    snippets.classList.add( 'post__body__code' );
    let script = document.createElement( 'script' );
    script.src = 'public/javascripts/prism.js';
    snippetWrapper.appendChild( script );
    post.snippetsArray.forEach( codeItem => {
      let lineNums = document.createElement( 'pre' ),
          code     = document.createElement( 'code' );
      lineNums.classList.add( 'line-numbers' );
      code.innerHTML = codeItem.code;
      code.classList.add( `language-${ codeItem.language }` );
      lineNums.appendChild( code );
      snippetWrapper.appendChild( lineNums );
    } );
    snippets.appendChild( snippetWrapper );
    body.appendChild( snippets );
  }
  return body;
}

function createPostFooter ( post ) {
  console.log( post );
  let footer        = document.createElement( 'div' ),
      footerWrapper = document.createDocumentFragment();
  footer.classList.add( 'post__footer' );
  let icons = [ 'thumb_up', 'insert_comment' ];
  icons.forEach( title => {
    let span       = document.createElement( 'span' ),
        a          = document.createElement( 'a' ),
        i          = document.createElement( 'i' ),
        spanAmount = document.createElement( 'span' );
    a.classList.add( 'btn', 'waves-circle', 'btn-floating', 'waves-effect', 'waves-red' );
    i.classList.add( 'material-icons' );
    i.innerText = title;
    i.dataset.role = 'like';
    i.dataset.postId = post.postId;
    spanAmount.innerText = 0;
    spanAmount.dataset.likePlace = post.postId;
    span.appendChild( a ).appendChild( i );
    span.appendChild( spanAmount );
    footerWrapper.appendChild( span );
  } );
  footer.appendChild( footerWrapper );
  return footer;
}

newSnippet.addEventListener( 'submit', function ( e ) {
  e.preventDefault();
  let formData = new FormData( this );
  let request = new Request( this.action, {
    method: 'POST',
    body  : formData
  } );
  fetch( request )
    .then( response => response.text() )
    .then( response => {
      response = JSON.parse( response );
      if ( response.status !== 'Failed' ) {
        uploadingSnippetsArray.push( response.text );
        let wrapper             = document.createDocumentFragment(),
            newPost__attachment = document.createElement( 'div' ),
            row                 = document.createElement( 'div' ),
            col12               = document.createElement( 'div' );
        newPost__attachment.classList.add( 'new-post__attachment' );
        row.classList.add( 'row' );
        col12.classList.add( 'col' );
        col12.classList.add( 's12' );
        col12.classList.add( 'flow-text' );
        col12.innerText = 'Snippet';
        row.appendChild( col12 );
        newPost__attachment.appendChild( row );
        wrapper.appendChild( newPost__attachment );
        documentsPlace.appendChild( wrapper );
      } else {
        M.toast( { html: response.text } );
      }
    } );
} );

fileForm.addEventListener( 'submit', function ( e ) {
  e.preventDefault();
  let formData = new FormData( this );
  let request = new Request( this.action, {
    method: 'POST',
    body  : formData
  } );
  fetch( request )
    .then( response => response.text() )
    .then( response => {
      response = JSON.parse( response );
      if ( response.status !== 'Failed' ) {
        uploadingPhotosArray.push( response.text );
        let wrapper             = document.createDocumentFragment(),
            newPost__attachment = document.createElement( 'div' ),
            row                 = document.createElement( 'div' ),
            col12               = document.createElement( 'div' );
        newPost__attachment.classList.add( 'new-post__attachment' );
        row.classList.add( 'row' );
        col12.classList.add( 'col' );
        col12.classList.add( 's12' );
        col12.classList.add( 'flow-text' );
        col12.innerText = 'Photo';
        row.appendChild( col12 );
        newPost__attachment.appendChild( row );
        wrapper.appendChild( newPost__attachment );
        documentsPlace.appendChild( wrapper );
      } else {
        M.toast( { html: response.text } );
      }
    } );
} );