import React from "react";
import {ethers} from 'ethers'
import './App.css';
import { useState, useEffect } from "react"
import contractMeta from './utils/PersonalDataManagerContract.json'

const contractABI = contractMeta.abi
const contractAddress = '0x1f93110A7A0546dEe5109618470DC588C224003a'


export default function App() {
  const [personalData, setPersonalData] = useState({
    name: '',
    phoneNumber: '',
    emailAddress: '',
    socialLinks: '',
    price: ''
  })

  const [balance, setBalance] = useState(0)
  const [account, setAccount] = useState()
  const [message, setMessage] = useState()
  const [actionsEnabled, setActionsEnabled] = useState(false)
  const [contract, setContract] = useState()
  const [searchAddress, setSearchAddress] = useState()
  const eth = window.ethereum

  const checkIfWalletIsConnected = async () => {
    const accounts = await eth.request({ method: 'eth_accounts' });
    if (!accounts.length) {
      setMessage("Account not linked")
      setActionsEnabled(false)
      return
    }

    setAccount(accounts[0])
  }

  const connectWallet = async () => {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts.length) {
      setMessage("Account not linked")
      setActionsEnabled(false)
      return
    }

    setAccount(accounts[0])
  }

  const addPersonalData = async () => {
    if (personalData.price <= 0) {
      setMessage('Invalid price')
      return
    }

    console.log('addPersonalData', personalData)
    setActionsEnabled(false)
    try {
      const tx = await contract.addPersonalData(
        personalData.price,
        personalData.name,
        personalData.emailAddress,
        personalData.phoneNumber,
        personalData.socialLinks
      )
      const txData = await tx.wait()
      for (const evt of txData.events) {
        if (evt.event === 'PersonalDataAdded') {
          setMessage('Successfully added data')
        }
      }
    }
    catch (e) {
      console.log(e)
      setMessage('Failed to update data')
    }

    setActionsEnabled(true)
  }

  const updateBalance = async () => {
    console.log('Balance queried')
    try {
      const data = await contract.getPointsBalance()
      setBalance(data.toString())
    }
    catch (e) {
      console.error(e)
      setMessage('Balance inquiry cancelled')
    }
  }

  const getPersonalData = async (address) => {
    const data = await contract.getFullPersonalData(address)
    if (data.balance.isActivated) {
      setPersonalData({
        name: data.personalData.fullName,
        phoneNumber: data.personalData.phoneNumbers,
        emailAddress: data.personalData.emailAddresses,
        socialLinks: data.personalData.socialLinks,
        price: data.personalData.price.toString()
      })
      setBalance(data.balance.amount.toString())
    }
  }

  const refreshPersonalData = async () => {
    console.log('Refresh personal data')
    try {
      await getPersonalData(account)
    }
    catch (e) {
      console.error(e)
      setMessage('An error occurred while refreshing your data')
    }
    setSearchAddress('')
  }

  const getPersonalDataAccess = async (address) => {
    console.log('Get other personal data')

    setActionsEnabled(false)
    try {
      const tx = await contract.getPersonalDataAccess(address)
      await tx.wait()
      getPersonalData(address)
    }
    catch (e) {
      console.error(e)
      setMessage('Could not load data')
    }
    setActionsEnabled(true)
  }

  const getDataPrice = async () => {
    const address = document.getElementById('searchBar').value
    if (!address || !address.trim().length) {
      setMessage('Invalid address')
      return
    }
    try {
      const price = await contract.getDataPrice(address)
      setMessage(`Data Access costs ${price} points`)
    }
    catch (e) {
      console.log(e)
      setMessage('Invalid address')
    }
  }

  const withdraw = async () => {
    console.log('withdraw')
    try {
      const tx = await contract.withdraw10()
      await tx.wait()
    }
    catch (e) {
      console.error(e)
      if (e.args) {
        console.log(e.args)
      }
    }
  }

  const deposit = async () => {
    try {
      console.log('deposit')
      const tx = await contract.deposit({ value: ethers.utils.parseEther('0.001') })
      await tx.wait()
    }
    catch (e) {
      console.error(e)
      if (e.args) {
        console.log(e.args)
      }
    }
  }

  const disabledAttribute = actionsEnabled ? {} : {
    disabled: 'disabled'
  }

  const onLoadDataClicked = () => {
    const address = document.getElementById('searchBar').value
    setSearchAddress(address)
  }

  const onInputChange = (event) => {
    if (event.target.name === 'price') {
      event.target.value = Math.floor(Number(event.target.value))
    }

    setPersonalData({
      ...personalData,
      [event.target.name]: event.target.value
    })
  }

  useEffect(() => {
    if (!eth) {
      setMessage('Make sure you have metamask!')
      setActionsEnabled(false)
      return
    }

    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    if (signer) {
      setContract(new ethers.Contract(contractAddress, contractABI, signer))
    }
  }, [])

  useEffect(async () => {
    await checkIfWalletIsConnected();
  }, [])

  useEffect(async () => {
    if (!account) {
      setMessage("No account linked")
      setActionsEnabled(false)
      return
    }

    if (!contract) {
      setMessage("Unable to reach service")
      setActionsEnabled(false)
      return
    }

    setActionsEnabled(true)
    setMessage(null)
    await refreshPersonalData()
  }, [account])

  useEffect(() => {
    if (!contract || !account) {
      return
    }

    contract.on('BalanceChanged', async (address, newBalance) => {
      if (address.toLowerCase() !== account.toLowerCase()) {
        return
      }
      setBalance(newBalance.amount.toString())
      console.log('Balance Changed')
    })
  }, [contract, account])

  useEffect(async () => {
    try {
      if (!searchAddress || !searchAddress.trim().length) {
        return
      }
      await getPersonalData(searchAddress)
    }
    catch (e) {
      console.log(e)
      await getPersonalDataAccess(searchAddress)
    }
  }, [searchAddress])

  const isOwnerAccount = (!searchAddress || !searchAddress.trim().length || account === searchAddress)

  return (
    <div className="mainContainer">

      <div className="dataContainer">
        <div className="header ph-10">
          Personal Data Manager
        </div>

        <div className="bio ph-10">
          Add your personal data and set your price in PDM points.
          Anyone interested in your data will have to pay to view it.
          Everyone starts with 1 million points.
        </div>

        {
          message &&
          <div className="message">
            {message}
          </div>
        }

        <div className="search-container">
          <input className="search" id="searchBar" placeholder="Enter/Paste an address to search" />
          <button className="ml-10" onClick={getDataPrice}>Get Price</button>
          <button className="ml-10 green" onClick={onLoadDataClicked}>Load Data</button>
        </div>
        <div className="upperSection ph-10">
          <div>
            <div className="formHeader">Your personal data</div>
            <div>
              <label>Name:</label>
              <input name='name' onChange={onInputChange} value={personalData.name} />
            </div>
            <div>
              <label>Email:</label>
              <input name='emailAddress' onChange={onInputChange} value={personalData.emailAddress} />
            </div>
            <div>
              <label>Phone:</label>
              <input name='phoneNumber' onChange={onInputChange} value={personalData.phoneNumber} />
            </div>
            <div>
              <label>Social:</label>
              <input name='socialLinks' onChange={onInputChange} value={personalData.socialLinks} />
            </div>
            <div>
              <label>Price:</label>
              <input name='price' type="number" min={1} step={1} onChange={onInputChange} value={personalData.price} />
            </div>
            {
              account &&
              (isOwnerAccount &&
                <button className="green" onClick={addPersonalData} {...disabledAttribute}>Save</button> ||
                <button onClick={refreshPersonalData}>Load my data</button>)
            }
            {
              !account &&
              <button onClick={connectWallet}>Link account</button>
            }
          </div>

          <div>
            <div className="formHeader">Your balance</div>
            <p>{balance} points</p>
            <button onClick={updateBalance} {...disabledAttribute}>Refresh</button>
            <button className="ml-10" onClick={deposit} {...disabledAttribute}>Buy 100</button>
            <button className="ml-10" onClick={withdraw} {...disabledAttribute}>Withdraw</button>
          </div>
        </div>
      </div>
    </div>
  );
}
