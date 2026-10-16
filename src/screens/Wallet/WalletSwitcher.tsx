import React, {ReactNode, useState} from 'react'
import {observer} from 'mobx-react-lite'
import {ColorValue, Keyboard, Pressable, TextStyle, View, ViewStyle} from 'react-native'
import FastImage from 'react-native-fast-image'
import {BottomModal, Button, Icon, ListItem, Text, TextField} from '../../components'
import {useStores} from '../../models'
import {walletsStore, WalletEntry} from '../../models/WalletsStore'
import {translate} from '../../i18n'
import {getImageSource} from '../../utils/utils'
import {spacing, useThemeColor} from '../../theme'

type SheetMode = 'list' | 'add' | 'rename'

const MAX_NAME_LENGTH = 24

export const walletDisplayName = function (wallet: WalletEntry) {
    return wallet.name || translate('walletSwitcher_defaultName', {number: wallet.number})
}

/**
 * Round avatar for a wallet. The default wallet shows the Minibits profile picture
 * when there is one, otherwise (and for preview wallets) the name's initial.
 */
const WalletAvatar = observer(function (props: {wallet: WalletEntry; size: number}) {
    const {wallet, size} = props
    const {walletProfileStore} = useStores()
    const bg = useThemeColor('buttonPressed')
    // Untyped so it fits both View and FastImage style props
    const $circle = {width: size, height: size, borderRadius: size / 2}

    if (wallet.isDefault && walletProfileStore.picture) {
        return (
            <FastImage
                style={$circle}
                source={{uri: getImageSource(walletProfileStore.picture)}}
            />
        )
    }

    return (
        <View style={[$circle, $initialCircle, {backgroundColor: bg}]}>
            <Text
                weight='medium'
                text={walletDisplayName(wallet).charAt(0).toUpperCase()}
                style={{fontSize: size * 0.45}}
            />
        </View>
    )
})

/**
 * Wallet screen header title: the active wallet's name with a chevron, opening the
 * switcher. Shown even with one wallet so the switcher can be found. `status`
 * renders under the name (the screen's offline and sync messages).
 */
export const WalletSwitcherTitle = observer(function (props: {
    onPress: () => void
    color: ColorValue
    status?: ReactNode
}) {
    const {onPress, color, status} = props
    const name = walletDisplayName(walletsStore.active)

    return (
        <Pressable
            style={$titleButton}
            onPress={onPress}
            hitSlop={spacing.small}
            accessibilityRole='button'
            accessibilityLabel={`${translate('walletSwitcher_title')}: ${name}`}
        >
            <View style={$titleRow}>
                <Text
                    text={name}
                    weight='medium'
                    size='md'
                    numberOfLines={1}
                    style={[$titleText, {color}]}
                />
                <Icon
                    icon='faChevronDown'
                    size={spacing.small}
                    color={color}
                    containerStyle={$titleChevron}
                />
            </View>
            {status}
        </Pressable>
    )
})

/**
 * Bottom sheet that lists wallets to switch between, and adds or renames them.
 * One sheet with three views rather than stacked modals.
 */
export const WalletSwitcherSheet = observer(function (props: {
    isVisible: boolean
    onClose: () => void
}) {
    const {isVisible, onClose} = props
    const [mode, setMode] = useState<SheetMode>('list')
    const [name, setName] = useState('')
    const checkColor = useThemeColor('tint')

    const active = walletsStore.active

    // The name field autofocuses, so leaving the form must also drop the keyboard
    const close = function () {
        Keyboard.dismiss()
        setMode('list')
        setName('')
        onClose()
    }

    const backToList = function () {
        Keyboard.dismiss()
        setMode('list')
        setName('')
    }

    const selectWallet = function (id: string) {
        walletsStore.setActive(id)
        close()
    }

    const startAdd = function () {
        setName('')
        setMode('add')
    }

    const startRename = function () {
        setName(active.name || '')
        setMode('rename')
    }

    // An empty name falls back to "Wallet <number>"
    const submit = function () {
        if (mode === 'add') {
            walletsStore.addPreview(name)
            close()
            return
        }

        walletsStore.rename(active.id, name)
        backToList()
    }

    const headingTx = mode === 'add'
        ? 'walletSwitcher_addTitle'
        : mode === 'rename'
            ? 'walletSwitcher_renameTitle'
            : 'walletSwitcher_title'

    const namePlaceholder = translate('walletSwitcher_defaultName', {
        number: mode === 'add' ? walletsStore.nextNumber : active.number,
    })

    const walletList = (
        <>
            {walletsStore.wallets.map(wallet => (
                <ListItem
                    key={wallet.id}
                    LeftComponent={
                        <View style={$avatarWrapper}>
                            <WalletAvatar wallet={wallet} size={40} />
                        </View>
                    }
                    text={walletDisplayName(wallet)}
                    RightComponent={
                        wallet.id === active.id
                            ? <Icon icon='faCheck' color={checkColor} />
                            : undefined
                    }
                    onPress={() => selectWallet(wallet.id)}
                    bottomSeparator={true}
                />
            ))}
            <ListItem
                leftIcon='faPencil'
                text={translate('walletSwitcher_renameWallet', {name: walletDisplayName(active)})}
                onPress={startRename}
                bottomSeparator={true}
            />
            <ListItem
                leftIcon='faPlus'
                tx='walletSwitcher_addWallet'
                onPress={startAdd}
            />
        </>
    )

    const nameForm = (
        <>
            <TextField
                value={name}
                onChangeText={setName}
                placeholder={namePlaceholder}
                maxLength={MAX_NAME_LENGTH}
                autoFocus={true}
                returnKeyType='done'
                onSubmitEditing={submit}
                containerStyle={$nameField}
            />
            <View style={$formButtons}>
                <Button
                    preset='tertiary'
                    tx='commonCancel'
                    onPress={backToList}
                />
                <Button
                    tx={mode === 'add' ? 'commonCreate' : 'commonSave'}
                    onPress={submit}
                    style={$submitButton}
                />
            </View>
        </>
    )

    return (
        <BottomModal
            isVisible={isVisible}
            headingTx={headingTx}
            headingStyle={$heading}
            ContentComponent={mode === 'list' ? walletList : nameForm}
            onBackButtonPress={mode === 'list' ? close : backToList}
            onBackdropPress={close}
        />
    )
})

const $initialCircle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
}

const $titleButton: ViewStyle = {
    alignItems: 'center',
}

const $titleRow: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
}

const $titleText: TextStyle = {
    flexShrink: 1,
}

const $titleChevron: ViewStyle = {
    marginLeft: spacing.tiny,
}

const $heading: TextStyle = {
    textAlign: 'center',
}

const $avatarWrapper: ViewStyle = {
    marginRight: spacing.medium,
}

const $nameField: ViewStyle = {
    marginVertical: spacing.medium,
}

const $formButtons: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
}

const $submitButton: ViewStyle = {
    marginLeft: spacing.small,
}
