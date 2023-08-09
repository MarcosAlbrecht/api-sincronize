var express = require('express')();
//const http = require('http');
//const socketIO = require('socket.io');
const net = require('net');
const { v4: uuidv4 } = require('uuid')
const NodeRSA = require('node-rsa');
const forge = require('node-forge');

// const app = express();
// const server = http.createServer(app);
// const io = socketIO(server, {
//     cors: {
//       origin: '*',
//       credentials: true
//     }
//   });
var http = require('http').Server(express);
var io = require('socket.io')(http);

  // const netClient = net.createConnection({port: 3000, host: '10.0.1.113'},() => {
  //   console.log('Conexão estabelecida com o servidor do relogio')

  //   netClient.write('02 0F 00 30 31 2B 52 55 2B 30 30 2B 4E 52 5F 46 41 42 32 03');
  // });

  // netClient.on('data', (data) => {
  //   console.log('Dados recebidos do servidor:', data.toString());
  // });

  // netClient.on('end', () => {
  //   console.log('Conexão encerrada pelo servidor');
  // });

  const netServer = net.createServer((netClient) => {
    const dataAtual = new Date();
    console.log('nova conexão iniciada')
    const dataString = dataAtual.toISOString().replace('T', ' ').slice(0, 19);
    console.log(`${dataString} Novo cliente conectado , ${netClient.localAddress}:${netClient.localPort}`);
  
    //busca informações do empregador no relógio
    
      const numFabricacao = "02 0F 00 30 31 2B 52 43 2B 30 30 2B 4E 52 5F 46 41 42 32 03";
      //const numFabricacao = "02 0F 00 30 30 2b 52 43 2b 30 30 30 2b 4c 4f 47 49 4e 5b 74 65 73 74 65 20 66 61 62 72 69 63 61 5d 53 45 4e 48 41 5f 4d 45 4e 55 5b 31 31 31 31 31 31 2b 4e 52 5f 52 45 50 42 32 03";
      
      const mensagemBytes = numFabricacao.split(' ').map(hex => parseInt(hex, 16));
      
      // Convertendo os bytes da mensagem em um Buffer
      const mensagemBuffer = Buffer.from(mensagemBytes);
      netClient.write(mensagemBuffer);   
  
      netClient.on('data', (data) => {
      const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);

      if (!clienteCorrespondente) {
        // Cliente não encontrado, talvez ele tenha sido desconectado ou ocorreu algum erro.
        //console.log('Cliente não encontrado!');
        //return;
      }

      // Encontra a posição do "["      
      //primme ponto
      if(data.toString().includes("01+RC+000+NR_FAB")) {
        const dadosRecebidos = data.toString();
        const posicaoAberturaColchete = dadosRecebidos.indexOf("[");
        const valorExtraido = dadosRecebidos.substring(posicaoAberturaColchete + 1, posicaoAberturaColchete + 1 + 17);
        console.log('num fabricacao relogio tratado', valorExtraido)

        const clientNumFab = Object.values(clientesConectados).find(cliente => cliente.num_fab === valorExtraido);

        
        if (!clientNumFab) {
          //insere novo cliente relogio 
          console.log('inserindo novo netClient') 
          const uuidV4 = uuidv4();
          //console.log('UUID v4:', uuidV4);
          const porta = netClient.localPort;
          const enderecoCliente = netClient.remoteAddress;
          const ip = enderecoCliente.replace("::ffff:", "");

          const cliente = {
            id: uuidV4,
            netClient: netClient,
            socketIo: null,
            ip: ip,
            porta: porta,
            cnpj: '10.786.517/0001-01',
            num_fab: valorExtraido,
          }

          clientesConectados[uuidV4] = cliente;

          //const dadosRecebidos = data.toString();

          return;
        }else{
          //caso econtre, só edita o netCLient
          console.log('editando netClient')
          clientNumFab.netClient = netClient
          clientesConectados[clientNumFab.id] = clientNumFab;
        }
      }

      //primme ponto - evento online
      if (data.toString().includes("RO+000+EV")) {
        
        if (clienteCorrespondente && clienteCorrespondente.socketIo != null) {
          console.log('achou cliente e esta enviando evento')
          
          const cliente = clientesConectados[clienteCorrespondente.id];
          console.log('cliente encontrado', cliente)

          mensagem_enviada = "[ " + pegarDataAtual() + " ] - Evento Online: " + data.toString();
          var obj_mensagem = {msg: mensagem_enviada, tipo: 'privado'};

          cliente.socketIo.emit('atualizar mensagens', obj_mensagem)

          

          //usuarios[usuario].emit("atualizar mensagens", obj_mensagem);
        }
      }

      //prisma ADV R2
      if (data.toString().includes("01+RC+009")) {
        //const dataAtual = new Date();
        console.log(`${pegarDataAtual()} Relógio prisma entrou no evento on("data") ${data.toString()}`)

        const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);

         if (!clienteCorrespondente) {
          console.log("Inserindo Relógio prisma")
        
          const uuidV4 = uuidv4();
          const porta = netClient.localPort;
          const enderecoCliente = netClient.localAddress;
          const cliente = {
            id: uuidV4,
            netClient: netClient,
            socketIo: null,
            ip: enderecoCliente,
            porta: porta,
            cnpj: '10.786.517/0001-01',
            num_fab: '',
            token_advr2: '',
          }

          clientesConectados[uuidV4] = cliente;
        }
        //mandar string para autenticar
        //01+RA+00
        //02 08 00 30 31 2B 52 41 2B 30 30 1A 03
        const autenticar = '02 08 00 30 31 2B 52 41 2B 30 30 1A 03'
        const mensagemBytes = autenticar.split(' ').map(hex => parseInt(hex, 16));
      
        // Convertendo os bytes da mensagem em um Buffer
        const mensagemBuffer = Buffer.from(mensagemBytes);
        
        netClient.write(mensagemBuffer)
        // }else{
        //   console.log("Relógio prisma ja está na lista", clienteCorrespondente)
        // }
        //netClient.destroy()
        return
      }

      // ADV R2
      //RETORNO DO PEDIDO DE AUTENTICAÇÃO COM TOKEN DE ACESSO
      if (data.toString().includes("01+RA+000+")) {
        const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);

        const inputString = data.toString();
        const regex = /01\+RA\+000\+(.*?)\]/;
        const match = regex.exec(inputString);

        console.log('recebeu token adv R2: ',match[1])
        //clienteCorrespondente.token_advr2 = match[1]
        //clientesConectados[clienteCorrespondente.id] = clienteCorrespondente;
        const rPos = inputString.indexOf(']');
        //const _gModulus = inputString.substring(11, rPos);
        const _gModulus = match[1]

        const _rPacoteString = inputString.substring(rPos + 1, rPos + 5);    

        const _gExpoent = _rPacoteString.replace(/\r?\n/g, '');

        console.log('_gExpoent: ',_gExpoent)

        const _gKeyAES = generateKeyAES(16); // You need to define the GenerateKeyAES function

        const _gUsuario = 'teste fabrica';
        const _gSenha = '111111';

        const _rDados = `${1}]${_gUsuario}]${_gSenha}]${MIMEBase64Encode(_gKeyAES)}`;

        const _rMensagem = EncryptRSA(_gModulus, _gExpoent, _rDados); // You need to define the EncryptRSA function

        const finalOutput = `01+EA+00+${_rMensagem}`;
        console.log('Final Output: ', finalOutput);

        const byteArray = stringToBytes(finalOutput);
        console.log('resultado de stringToBytes',byteArray);

        const _rPacoteHex = convertToHex(byteArray);
        const _rHexa = `02 B5 00 30 31 2B 45 41 2B 30 30 2B ${_rPacoteHex} 03`
        console.log('resultado de convertToHex',_rPacoteHex);

        const mensagemBytes = _rPacoteHex.split(' ').map(hex => parseInt(hex, 16));
      
        // Convertendo os bytes da mensagem em um Buffer
        const mensagemBuffer = Buffer.from(mensagemBytes);

        console.log('resultado de buffer',mensagemBuffer);

        netClient.write(mensagemBuffer);

        return

      }
      
      // Aqui você pode fazer qualquer manipulação ou processamento necessário com os dados recebidos do cliente
      if (clienteCorrespondente) {
        console.log(`Dados recebidos do cliente com ID ${clienteCorrespondente.id}:`, data.toString().trim());  
      }

      console.log(`Dados recebidos do cliente:`, data.toString().trim());
      
      
  
    });
  
    netClient.on('end', () => {
      const dataAtual = new Date();


      const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);

      if (clienteCorrespondente) {
        clienteCorrespondente.netClient = null;
        clientesConectados[clienteCorrespondente.id] = clienteCorrespondente;
        console.log(`${dataAtual} Cliente com ID ${clienteCorrespondente.id} desconectado`);
      } else {
        console.log("Relogio desconectado.");
      }
          
    // const dataString = dataAtual.toISOString().replace('T', ' ').slice(0, 19);
    //   console.log(`Cliente com ID ${cliente.id} desconectado`);
    //   const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);
    //   clienteCorrespondente.netClient = null
    //   clientesConectados[clienteCorrespondente.id] = clienteCorrespondente
    });

    netClient.on('timeout', () => {
      console.log('Conexão atingiu o tempo limite de inatividade.');
    });
    
    netClient.on('close', () => {
        console.log('Conexão completamente fechada.');
    });

    netClient.on('error', () => {
      console.log('Ocorreu erro', netClient)
    })
  });

netServer.listen(3005, () => {
    console.log(`Servidor de http está ouvindo na porta 3005`);
});

//const HOST = '10.0.1.101';
//const PORT = 3001;


var clientesConectados = [];
var usuarios = []; // Lista de usuários

var ultimas_mensagens = []; 

io.on('connection', (socket) => {
  console.log('Novo cliente conectado: ',socket.id);
  socket.handshake.headers['Access-Control-Allow-Credentials'] = true;

  socket.on("entrar", function(apelido, callback){
    if(!(apelido in usuarios)){
        socket.apelido = apelido;
        usuarios[apelido] = socket; // Adicionadno o nome de usuário a lista armazenada no servidor
        console.log('Cliente conectou: '+socket.id)
        //console.log('usuarios conectados: ',usuarios)
        // Enviar para o usuário ingressante as ultimas mensagens armazenadas.
        for(indice in ultimas_mensagens){
            socket.emit("atualizar mensagens", ultimas_mensagens[indice]);
        }


        var mensagem = "[ " + pegarDataAtual() + " ] " + apelido + " acabou de entrar na sala";
        var obj_mensagem = {msg: mensagem, tipo: 'sistema'};

        io.sockets.emit("atualizar usuarios", Object.keys(usuarios)); // Enviando a nova lista de usuários
        io.sockets.emit("atualizar mensagens", obj_mensagem); // Enviando mensagem anunciando entrada do novo usuário

        armazenaMensagem(obj_mensagem); // Guardando a mensagem na lista de histórico

        callback(true);
    }else{
        callback(false);
    }
});

socket.on("reconnect_error", (error) => {
    console.log('erro ao conectar: ',error)
  });


socket.on("enviar mensagem", function(dados, callback){

    var mensagem_enviada = dados.msg;
    var msg = mensagem_enviada;
    var usuario = dados.usu;
    if(usuario == null)
        usuario = ''; // Caso não tenha um usuário, a mensagem será enviada para todos da sala

    mensagem_enviada = "[ " + pegarDataAtual() + " ] " + socket.apelido + " diz: " + mensagem_enviada;
    var obj_mensagem = {msg: mensagem_enviada, tipo: ''};

    if(usuario == ''){
        io.sockets.emit("atualizar mensagens", obj_mensagem);
        armazenaMensagem(obj_mensagem); // Armazenando a mensagem
    }else{
        obj_mensagem.tipo = 'privada';
        socket.emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário que a enviou
        usuarios[usuario].emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário escolhido
    }
    console.log('antes do if receber hora: ',mensagem_enviada)
    if (msg == '01+RH+00') {
      //const mensagemHexadecimal = '02 08 00 30 31 2B 52 48 2B 30 30 13 03'; // Exemplo de mensagem hexadecimal
      const mensagemHexadecimal = "02 " + stringToHex(msg) + " 03";
      const mensagemBytes = mensagemHexadecimal.split(' ').map(hex => parseInt(hex, 16));
      
      // Convertendo os bytes da mensagem em um Buffer
      const mensagemBuffer = Buffer.from(mensagemBytes);
      console.log('entrou no if receber hora: ',mensagem_enviada)
      console.log('buffer: ',mensagemBuffer)

      //client.write(mensagemBuffer);
          
    }
    
    callback();
});

socket.on("enviar equipamento", function(dados, callback){
  console.log('Equipamento enviado', dados.msg)
  console.log('dados', dados)

  const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.num_fab === dados.msg);
  if (clienteCorrespondente) {
    clienteCorrespondente.socketIo = socket;
    clientesConectados[clienteCorrespondente.id] = clienteCorrespondente
    console.log('relogio encontrato na lista', clientesConectados)
  }
});

socket.on("disconnect", function(){
    delete usuarios[socket.apelido];
    var mensagem = "[ " + pegarDataAtual() + " ] " + socket.apelido + " saiu da sala";
    var obj_mensagem = {msg: mensagem, tipo: 'sistema'};


    // No caso da saída de um usuário, a lista de usuários é atualizada
    // junto de um aviso em mensagem para os participantes da sala		
    io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
    io.sockets.emit("atualizar mensagens", obj_mensagem);

    armazenaMensagem(obj_mensagem);

    });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// server.listen(3010, () => {
//   console.log('Servidor Socket.io está em execução na porta 3010');
// });
http.listen(3010, function(){
  console.log('Socket.io listening on: 3010');
});

function pegarDataAtual(){
	var dataAtual = new Date();
	var dia = (dataAtual.getDate()<10 ? '0' : '') + dataAtual.getDate();
	var mes = ((dataAtual.getMonth() + 1)<10 ? '0' : '') + (dataAtual.getMonth() + 1);
	var ano = dataAtual.getFullYear();
	var hora = (dataAtual.getHours()<10 ? '0' : '') + dataAtual.getHours();
	var minuto = (dataAtual.getMinutes()<10 ? '0' : '') + dataAtual.getMinutes();
	var segundo = (dataAtual.getSeconds()<10 ? '0' : '') + dataAtual.getSeconds();

	var dataFormatada = dia + "/" + mes + "/" + ano + " " + hora + ":" + minuto + ":" + segundo;
	return dataFormatada;
}

// Função para guardar as mensagens e seu tipo na variável de ultimas mensagens
function armazenaMensagem(mensagem){
	if(ultimas_mensagens.length > 5){
		ultimas_mensagens.shift();
	}

	ultimas_mensagens.push(mensagem);
}

function stringToHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i).toString(16).toUpperCase();
    hex += charCode.padStart(2, '0') + ' ';
  }
  return hex.trim();
}

function generateKeyAES(keySize) {
  const i_KeySizeBits = keySize * 8;
  let result = '';

  if (i_KeySizeBits !== 128 && i_KeySizeBits !== 192 && i_KeySizeBits !== 256) {
    throw new Error('Invalid AES key length');
  }

  while (keySize > 0) {
    // Since you're using Randomize and RandomRange in Delphi,
    // you can use the crypto module in Node.js to achieve similar functionality.
    const randomDigit = Math.floor(Math.random() * 10); // Generates a random digit from 0 to 9
    result += randomDigit.toString();

    keySize--;
  }

  return result;
}

function MIMEBase64Encode(inputString) {
  const buffer = Buffer.from(inputString, 'utf-8');
  const encodedData = buffer.toString('base64');

  // Manually apply padding if needed
  const padding = '='.repeat((4 - (encodedData.length % 4)) % 4);
  
  return encodedData + padding;
}

function EncryptRSA(s_Modulus, s_Exponent, s_Plain) {
  const publicKey = new NodeRSA();
  publicKey.importKey(
    {
      n: Buffer.from(s_Modulus, 'base64'), // Decoded from base64
      e: Buffer.from(s_Exponent, 'base64') // Decoded from base64
    },
    'components-public'
  );

  const encryptedBuffer = publicKey.encrypt(s_Plain, 'base64');
  return encryptedBuffer;
}

function stringToBytes(pPackage) {
  const CONST_START_BYTE = 0x02;
  const CONST_END_BYTE = 0x03;

  function nextByte(byteArray) {
    byteArray.push(0);
  }

  const packageBytes = [];
  let _rChecksum = 0;

  packageBytes.push(CONST_START_BYTE);

  const packageLength = pPackage.length;
  nextByte(packageBytes);
  packageBytes.push(packageLength & 0xFF);
  nextByte(packageBytes);
  packageBytes.push((packageLength >> 8) & 0xFF);

  for (let i = 0; i < packageLength; i++) {
    packageBytes.push(pPackage.charCodeAt(i));
    nextByte(packageBytes);
  }

  for (let i = 0; i <= packageLength; i++) {
    _rChecksum ^= pPackage.charCodeAt(i);
  }
  _rChecksum ^= packageLength & 0xFF;
  _rChecksum ^= (packageLength >> 8) & 0xFF;
  packageBytes.push(_rChecksum);

  nextByte(packageBytes);
  packageBytes.push(CONST_END_BYTE);

  return new Uint8Array(packageBytes);
}

function convertToHex(byteArray) {
  return byteArray.reduce((hexString, byte) => {
    const byteHex = byte.toString(16).padStart(2, '0');
    return hexString + byteHex + ' ';
  }, '');
}