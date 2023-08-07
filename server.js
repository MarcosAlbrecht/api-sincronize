const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const net = require('net');
const hexy = require('hexy');
const { v4: uuidv4 } = require('uuid')
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
      origin: '*',
    }
  });

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
    
      //const numFabricacao = "02 0F 00 30 31 2B 52 43 2B 30 30 2B 4E 52 5F 46 41 42 32 03";
      const numFabricacao = "02 0F 00 30 30 2b 52 43 2b 30 30 30 2b 4c 4f 47 49 4e 5b 74 65 73 74 65 20 66 61 62 72 69 63 61 5d 53 45 4e 48 41 5f 4d 45 4e 55 5b 31 31 31 31 31 31 2b 4e 52 5f 52 45 50 42 32 03";
      
      const mensagemBytes = numFabricacao.split(' ').map(hex => parseInt(hex, 16));
      
      // Convertendo os bytes da mensagem em um Buffer
      const mensagemBuffer = Buffer.from(mensagemBytes);
      //netClient.write(mensagemBuffer);   
  
      netClient.on('data', (data) => {
      const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);

      if (!clienteCorrespondente) {
        // Cliente não encontrado, talvez ele tenha sido desconectado ou ocorreu algum erro.
        console.log('Cliente não encontrado!');
        //return;
      }

      // Encontra a posição do "["      

      if(data.toString().includes("01+RC+000+NR_FAB")){
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
        console.log("Cliente não encontrado na lista de clientes conectados.", netClient);
      }
          
    // const dataString = dataAtual.toISOString().replace('T', ' ').slice(0, 19);
    //   console.log(`Cliente com ID ${cliente.id} desconectado`);
    //   const clienteCorrespondente = Object.values(clientesConectados).find(cliente => cliente.netClient === netClient);
    //   clienteCorrespondente.netClient = null
    //   clientesConectados[clienteCorrespondente.id] = clienteCorrespondente
    });
    netClient.on('error', () => {
      console.log('Ocorreu erro', netClient)
    })
  });

netServer.listen(3005, () => {
    console.log(`Servidor de http está ouvindo na porta 3001`);
});

const HOST = '10.0.1.101';
const PORT = 3001;


var clientesConectados = [];
var usuarios = []; // Lista de usuários

var ultimas_mensagens = []; 

io.on('connection', (socket) => {
  console.log('Novo cliente conectado: ',socket.id);

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

server.listen(3005, () => {
  console.log('Servidor Socket.io está em execução na porta 3005');
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