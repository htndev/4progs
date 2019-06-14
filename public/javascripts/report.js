function generateReport ( postInfo, post ) {
  let groupTitleBlock = doc.querySelector( '#report-group-title' ),
      groupLinkBlock  = doc.querySelector( '.report__object__link' ),
      link            = `/post/${ postInfo.groupId }/${ postInfo.postId }`,
      reportedTitle   = getPublisherTitle( post ),
      img             = post.querySelector( '.post__header__publisher-img' ).src,
      reportImg       = doc.querySelector( '#report-img' ),
      reportType      = doc.querySelector( '#reportType' ),
      reportId        = doc.querySelector( '#reportId' );
  console.log( post );
  console.log( postInfo );
  reportId.value = postInfo.postId;
  console.log( img );
  reportType.value = post.getAttribute( 'data-type' );
  reportImg.src = img;
  reportImg.alt = reportedTitle;
  groupLinkBlock.href = link;
  groupTitleBlock.innerText = reportedTitle;
}

$( document ).ready( function () {
  $( '#report' ).modal();
} );

$( document ).ready( function () {
  $( 'select' ).formSelect();
} );

function generatePersonalReport ( type ) {
  let groupTitleBlock = doc.querySelector( '#report-group-title' ),
      groupLinkBlock  = doc.querySelector( '.report__object__link' ),
      link            = `/${ type === 'group' ? 'g' : 'p' }/${ location.pathname
                                                                       .split( '/' )
                                                                       .pop() }`,
      reportedTitle   = doc.querySelector( '#user-title' ).innerText,
      img             = doc.querySelector( '#avatar' ).src,
      reportImg       = doc.querySelector( '#report-img' ),
      reportType      = doc.querySelector( '#reportType' ),
      reportId        = doc.querySelector( '#reportId' );
  console.log( img );
  reportId.value = location.pathname.split( '/' ).pop();
  reportType.value = type;
  reportImg.src = img;
  reportImg.alt = reportedTitle;
  groupLinkBlock.href = link;
  groupTitleBlock.innerText = reportedTitle;
  $( '#report' ).modal( 'open' );
}

( function () {
  let report = document.forms.report;
  if ( report !== undefined ) {
    report.addEventListener( 'submit', function ( e ) {
      e.preventDefault();
      let formData = new FormData( this ),
          request  = new Request( this.action, {
            method: 'POST', body: formData
          } );
      fetch( request )
        .then( response => response.text() )
        .then( response => {
          M.toast( { html: response } );
        } );
    } );
  }
} )();

function getPublisherTitle ( block ) {
  return block.querySelector( '.post__header__title' ).innerText;
}