import {Instance, types} from 'mobx-state-tree'

/**
 * Multi-wallet prototype (issue #105). UI only.
 *
 * Deliberately NOT part of RootStore and not persisted: adding it there would change
 * the persisted snapshot and need a rootStoreModelVersion migration. The default
 * wallet is the real wallet behind every other store; added wallets are previews
 * with no keys, funds or Lightning address yet, and the list resets on app restart.
 */
export const WalletEntryModel = types.model('WalletEntry', {
    id: types.identifier,
    // Undefined until the user names it, then shown as "Wallet <number>"
    name: types.maybe(types.string),
    number: types.number,
    isDefault: types.boolean,
})

export interface WalletEntry extends Instance<typeof WalletEntryModel> {}

export const WalletsStoreModel = types
    .model('WalletsStore', {
        wallets: types.array(WalletEntryModel),
        activeId: types.string,
    })
    .views(self => ({
        get active() {
            return self.wallets.find(w => w.id === self.activeId) || self.wallets[0]
        },
        get nextNumber() {
            return Math.max(...self.wallets.map(w => w.number)) + 1
        },
    }))
    .actions(self => ({
        setActive(id: string) {
            self.activeId = id
        },
        addPreview(name: string) {
            const id = `preview-${Date.now()}`
            self.wallets.push({
                id,
                name: name.trim() || undefined,
                number: self.nextNumber,
                isDefault: false,
            })
            self.activeId = id
        },
        rename(id: string, name: string) {
            const wallet = self.wallets.find(w => w.id === id)
            if (wallet) wallet.name = name.trim() || undefined
        },
    }))

export interface WalletsStore extends Instance<typeof WalletsStoreModel> {}

export const walletsStore = WalletsStoreModel.create({
    wallets: [{id: 'default', number: 1, isDefault: true}],
    activeId: 'default',
})
