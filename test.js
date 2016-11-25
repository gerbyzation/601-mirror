const chai = require('chai');
const sinon = require('sinon');

const expect = chai.expect;

const Channel = require('./server/feeds/Channel');
const Drain = require('./server/feeds/Drain');

describe('test the testing', () => {
  it('works', () => {
    expect(true).to.equal(true);
  })
})

describe('Channels', () => {
  it('flows to drain after init', () => {
    const channel = new Channel();
    const write = sinon.spy(channel.drain, '_write');

    channel.write('water going down the drain');
    sinon.assert.calledOnce(write);
    write.withArgs(
      'water going down the drain',
      sinon.match.any,
      sinon.match.any
    );

    write.restore();
  })

  it('pipes to new dest', () => {
    const channel = new Channel();
    const dump = new Drain();
    const writeToDrain = sinon.spy(channel.drain, '_write');
    const writeToDump = sinon.spy(dump, '_write');

    channel.write('water going down the drain');
    sinon.assert.calledOnce(writeToDrain);
    expect(0 === writeToDump.callCount).to.be.true

    channel.set(dump);
    channel.write('and up again');
    sinon.assert.calledOnce(writeToDump);

    // no new calls to drain, as it's only used when there is no destination
    sinon.assert.calledOnce(writeToDrain);

        // check args   
    writeToDrain.withArgs('and up again', sinon.match.any, sinon.match.any)
    writeToDump.withArgs('water going down the drain', sinon.match.any, sinon.match.any)
  })

  it('pipes to drain after removing dest', () => {
    const channel = new Channel();
    const dump = new Drain();
    const writeToDrain = sinon.spy(channel.drain, '_write');
    const writeToDump = sinon.spy(dump, '_write');

    channel.set(dump);

    channel.write('water going down the drain');
    sinon.assert.calledOnce(writeToDump);
    expect(0 === writeToDrain.callCount).to.be.true

    channel.unpipe(dump);
    channel.write('and up again');
    sinon.assert.calledOnce(writeToDrain);

    // no new calls to dump, as it's streaming back to drain
    sinon.assert.calledOnce(writeToDump); 

    // check args   
    writeToDump.withArgs('and up again', sinon.match.any, sinon.match.any)
    writeToDrain.withArgs('water going down the drain', sinon.match.any, sinon.match.any)
  });

});