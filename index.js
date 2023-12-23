const { AuthProvider } = window.arcana.auth;
const Web3 = window.solanaWeb3;
console.log(Web3)
var columnData = [];

function readExcel() {
  var fileInput = document.getElementById('fileInput');
  var file = fileInput.files[0];

  if (file) {
    var reader = new FileReader();

    reader.onload = function (e) {
      var data = e.target.result;
      var workbook = XLSX.read(data, { type: 'binary' });

      var sheetName = workbook.SheetNames[0];
      var sheet = workbook.Sheets[sheetName];

      var columnName = 'A';

      var range = XLSX.utils.decode_range(sheet['!ref']);
      var columnValues = [];
      for (var i = range.s.r; i <= range.e.r; i++) {
        var cellAddress = XLSX.utils.encode_cell({ r: i, c: XLSX.utils.decode_col(columnName) });
        var cellValue = sheet[cellAddress] ? sheet[cellAddress].v : undefined;
        columnValues.push(cellValue);
      }

      columnData = columnValues.filter(value => value !== undefined);

      console.log(columnData);
      alert('Column Data stored. You can click "Display" to view them.');
    };

    reader.readAsBinaryString(file);
  } else {
    alert('Please select an Excel file.');
  }
}

function send() {
  if (columnData.length > 0) {

    //  signing transactions individually

    for (var i = 0; i < columnData.length; i++) {
      console.log(columnData[i]);
      signAndSendTransaction(columnData[i]);
    }

    // signing transaction at once

    // signAllTransactions(columnData);

    console.log("all sent successfully");

  } else {
    alert('No wallet data available. Please read an Excel file first.');
  }
}


let provider;
let solanaP;
const auth = new AuthProvider(
  "xar_test_f4210049844670b77216d131b0d9d803342f0325",
);

provider = auth.provider;

window.Buffer = window.ethereumjs.Buffer.Buffer;
globalThis.Buffer = window.ethereumjs.Buffer.Buffer;

window.onload = async () => {
  try {
    console.time("auth_init");
    await auth.init();
    solanaP = auth.solana;
    setHooks();
    console.timeEnd("auth_init");
    console.log("Init auth complete!");
  } catch (e) {
    console.log({ e });
  }
};

const resElement = document.getElementById("result");
const accElement = document.getElementById("account");


function setResult(value) {
  resElement.innerText = value;
}

function setAccount(value) {
  accElement.innerText = value;
}

function setHooks() {
  provider.on("connect", async (params) => {
    console.log({ type: "connect", params: params });
  });
  provider.on("accountsChanged", (params) => {
    console.log({ type: "accountsChanged", params: params });
  });
  provider.on("chainChanged", async (params) => {
    console.log({ type: "chainChanged", params: params });
  });
}

async function logout() {
  console.log("Requesting logout");
  try {
    await auth.logout();
    setAccount("-");
  } catch (e) {
    console.log({ e });
  }
}

async function connect() {
  console.log("Requesting connect wallet");
  try {
    const provider = await auth.connect();
    console.log({ provider });
    await getAccounts();
  } catch (error) {
    console.log(error);
  }
}

let publicKey;

async function signAndSendTransaction(to_account) {
  try {

    const pk = new window.solanaWeb3.PublicKey(
      (
        await provider.request({
          method: "getAccounts",
          params: [],
        })
      )[0],
    );
    const connection = new window.solanaWeb3.Connection(
      window.solanaWeb3.clusterApiUrl("devnet"),
    );
    let minRent = await connection.getMinimumBalanceForRentExemption(0);
    let blockhash = await connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);
    console.log("blockhash {}", blockhash)
    const payer = solanaP;
    const to = new window.solanaWeb3.PublicKey(to_account);
    const instructions = [
      window.solanaWeb3.SystemProgram.transfer({
        fromPubkey: pk,
        toPubkey: to,
        lamports: minRent,
      }),
    ];

    const messageV0 = new window.solanaWeb3.TransactionMessage({
      payerKey: pk,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    let transaction = new window.solanaWeb3.VersionedTransaction(messageV0);

    // using seperate function to sign and send tx
    
    // const transactionSigned = await payer.signTransaction(transaction);            
    // const transactionSent = await connection.sendTransaction(transactionSigned);

    const transactionSent = await payer.signAndSendTransaction(transaction);
    console.log({ transactionSent });
    setResult(JSON.stringify(transactionSent, null, 2));
  } catch (e) {
    console.error(e);
    setResult(e);
  }
}

async function signAllTransactions(wallets) {
  let transaction = [];
  try {

    const pk = new window.solanaWeb3.PublicKey(
      (
        await provider.request({
          method: "getAccounts",
          params: [],
        })
      )[0],
    );
    const connection = new window.solanaWeb3.Connection(
      window.solanaWeb3.clusterApiUrl("testnet"),
    );
    let minRent = await connection.getMinimumBalanceForRentExemption(0);
    let blockhash = await connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const payer = solanaP;

    for (var i = 0; i < columnData.length; i++) {
      const to = new window.solanaWeb3.PublicKey(columnData[i]);
      console.log(to);
      const instructions = [
        window.solanaWeb3.SystemProgram.transfer({
          fromPubkey: pk,
          toPubkey: to,
          lamports: minRent,
        }),
      ];

      const messageV0 = new window.solanaWeb3.TransactionMessage({
        payerKey: pk,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      transaction[i] = new window.solanaWeb3.VersionedTransaction(messageV0);
    }

    const transactionSigned = await payer.signAllTransactions(transaction);
    console.log(transactionSigned);
    for (var i = 0; i < transactionSigned.length; i++) {
      console.log(transactionSigned[i]);
      const transactionSent = await connection.sendTransaction(transactionSigned[i]);
      console.log({ transactionSent });
      setResult(JSON.stringify(transactionSent, null, 2));
    }
  } catch (e) {
    console.error(e);
    setResult(e);
  }
}
