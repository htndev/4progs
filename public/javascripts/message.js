( function () {
  let messageForm = document.forms.message;
  if ( messageForm !== undefined ) {
    messageForm.addEventListener( 'submit', function ( e ) {
      e.preventDefault();
      let msg = document.querySelector( '#message' );
      if ( !!msg.value ) {
        socket.emit( 'chat message', {
          from: socket.query.split( '=' )[ 1 ], text: msg.value
        } );
        msg.value = '';
        document.querySelector( 'label[for="message"]' ).classList
          .remove( 'active' );
      }
    } );
  }
  socket.on( 'new message', data => {
    let place = document.querySelector( '#message-place' );
    if ( place !== null ) {
      let rowChat = document.createElement( 'div' );
      rowChat.classList.add( 'row', 'chat__msg' );
      let colL = document.createElement( 'div' ),
          colR = document.createElement( 'div' );
      colL.classList.add( 'col', 's2' );
      colR.classList.add( 'col', 's10' );
      let img = document.createElement( 'img' );
      img.src = data.user.avatar;
      img.classList.add( 'chat__img' );
      img.alt = data.user.user_title;
      let imgA = document.createElement( 'a' );
      imgA.href = '/p/' + data.user.user_name;
      colL.appendChild( imgA ).appendChild( img );
      let aTitle = document.createElement( 'a' ),
          h4     = document.createElement( 'h4' );
      h4.classList.add( 'chat__title' );
      h4.innerText = data.user.user_title;
      aTitle.href = '/p/' + data.user.user_name;
      colR.appendChild( aTitle ).appendChild( h4 );
      let p    = document.createElement( 'p' ),
          span = document.createElement( 'span' );
      p.classList.add( 'chat__message' );
      p.innerHTML = data.text;
      span.classList.add( 'chat__date' );
      span.innerText = data.date;
      colR.appendChild( p );
      colR.appendChild( span );
      rowChat.appendChild( colL );
      rowChat.appendChild( colR );
      place.appendChild( rowChat );
      document.querySelector( '.chat' ).scrollTop = document.querySelector( '.chat' ).scrollHeight;
    } else {
      if ( location.pathname !== '/' && !location.pathname.includes( '/reg' ) ) {
        M.toast( {
          html         : `<a href="/msg" style="color: #D1D8E0">${ data.user.user_title }: ${ data.text }</a>`,
          displayLength: 6000
        } );
      }
    }
  } );
} )();