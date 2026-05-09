declare module 'react-native-maps' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface MarkerDragEvent {
    nativeEvent: { coordinate: LatLng };
  }

  export interface MapPressEvent {
    nativeEvent: { coordinate: LatLng };
  }

  export interface MapViewProps extends ViewProps {
    initialRegion?: Region;
    region?: Region;
    onPress?: (event: MapPressEvent) => void;
    showsUserLocation?: boolean;
    showsCompass?: boolean;
    showsScale?: boolean;
    toolbarEnabled?: boolean;
    onRegionChangeComplete?: (region: Region) => void;
  }

  export interface CircleProps extends ViewProps {
    center: LatLng;
    radius: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }

  export interface MarkerProps extends ViewProps {
    coordinate: LatLng;
    draggable?: boolean;
    onDragEnd?: (event: MarkerDragEvent) => void;
    pinColor?: string;
    title?: string;
  }

  export default class MapView extends React.Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
  }

  export class Circle extends React.Component<CircleProps> {}
  export class Marker extends React.Component<MarkerProps> {}
}
