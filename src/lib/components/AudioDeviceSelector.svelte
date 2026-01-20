<script lang="ts">
	import { onMount } from 'svelte';
	import { audioDevices } from '$stores/audioDevices.svelte';
	
	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement;
	
	onMount(() => {
		audioDevices.loadDevices();
		
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
				isOpen = false;
			}
		}
		
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
	
	function toggleDropdown() {
		if (!audioDevices.isLoading) isOpen = !isOpen;
	}
	
	async function selectDevice(deviceId: string) {
		if (await audioDevices.selectDevice(deviceId)) isOpen = false;
	}
	
	function getShortLabel(label: string): string {
		return label.length > 12 ? label.substring(0, 11) + '...' : label;
	}
</script>

<div class="selector" bind:this={dropdownRef}>
	<button class="selector-btn" onclick={toggleDropdown} disabled={audioDevices.isLoading}>
		<span class="mic">MIC</span>
		<span class="name">
			{#if audioDevices.isLoading}
				...
			{:else if !audioDevices.hasPermission}
				--
			{:else}
				{getShortLabel(audioDevices.getSelectedLabel())}
			{/if}
		</span>
		<span class="arrow" class:open={isOpen}>v</span>
	</button>
	
	{#if isOpen}
		<div class="dropdown">
			{#each audioDevices.devices as device}
				<button
					class="item"
					class:active={device.deviceId === audioDevices.selectedDeviceId}
					onclick={() => selectDevice(device.deviceId)}
				>
					<span class="check">{device.deviceId === audioDevices.selectedDeviceId ? '*' : ''}</span>
					<span class="label">{device.label}</span>
				</button>
			{/each}
			{#if audioDevices.devices.length === 0}
				<div class="empty">Sin dispositivos</div>
			{/if}
			<button class="item refresh" onclick={() => audioDevices.loadDevices()}>
				Actualizar
			</button>
		</div>
	{/if}
</div>

<style>
	.selector {
		position: relative;
		flex: 1;
		max-width: 160px;
	}
	
	.selector-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 8px 10px;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 4px;
		color: #888;
		font-size: 0.7rem;
		text-align: left;
	}
	
	.selector-btn:hover {
		background: #222;
	}
	
	.mic {
		font-size: 0.6rem;
		color: #555;
		font-weight: 600;
	}
	
	.name {
		flex: 1;
		color: #8f8;
		font-family: monospace;
		font-size: 0.7rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.arrow {
		font-size: 0.6rem;
		color: #555;
		transition: transform 0.15s;
	}
	
	.arrow.open {
		transform: rotate(180deg);
	}
	
	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		min-width: 200px;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(0,0,0,0.5);
		z-index: 100;
		overflow: hidden;
	}
	
	.item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 12px;
		background: none;
		border: none;
		border-radius: 0;
		color: #aaa;
		font-size: 0.75rem;
		text-align: left;
	}
	
	.item:hover {
		background: #252525;
	}
	
	.item.active {
		background: #0a1a0a;
		color: #8f8;
	}
	
	.check {
		width: 10px;
		color: #0f0;
		font-family: monospace;
	}
	
	.label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.refresh {
		border-top: 1px solid #333;
		color: #666;
		justify-content: center;
	}
	
	.empty {
		padding: 12px;
		text-align: center;
		color: #555;
		font-size: 0.75rem;
	}
</style>
