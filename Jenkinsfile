pipeline {
    agent any

    environment {
        PROJECT_NAME = "jenkins"
        OPENSHIFT_SERVER = "https://api.ocp4.smartek.ae:6443"

        QUAY_CREDENTIALS_ID = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        OC_TOKEN_ID = 'oc-token-id'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:${BUILD_NUMBER}"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:${BUILD_NUMBER}"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift & Quay.io') {
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'),
                                 usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in to project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build and Push Frontend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/buildah/stable:latest
                            command: ['cat']
                            tty: true
                            securityContext:
                              runAsUser: 1000
                              runAsGroup: 1000
                              fsGroup: 1000
                            resources:
                              requests:
                                memory: "512Mi"
                                cpu: "500m"
                              limits:
                                memory: "2Gi"
                                cpu: "2"
                            env:
                            - name: STORAGE_DRIVER
                              value: vfs
                            - name: BUILDAH_ISOLATION
                              value: chroot
                            volumeMounts:
                            - name: buildah-storage
                              mountPath: /home/build/.local/share/containers
                          volumes:
                          - name: buildah-storage
                            emptyDir: {}
                    '''
                }
            }
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                        sh '''
                            echo "=== DEBUGGING WORKSPACE STRUCTURE ==="
                            pwd
                            ls -la
                            echo "=== CHECKING FOR FRONTEND DIRECTORY ==="
                            ls -la frontend/ || echo "Frontend directory not found"
                            find . -name "Dockerfile" -type f || echo "No Dockerfiles found"
                            echo "=== END DEBUG ==="
                            
                            echo "Setting up buildah for rootless builds..."
                            buildah --storage-driver=vfs login -u $QUAY_USER -p $QUAY_PASS quay.io
                            
                            # Check if Containerfile exists in expected location
                            if [ -f "./frontend/Containerfile" ]; then
                                echo "Found Containerfile at ./frontend/Containerfile"
                                DOCKERFILE_PATH="./frontend/Containerfile"
                                BUILD_CONTEXT="./frontend"
                            elif [ -f "./frontend/Dockerfile" ]; then
                                echo "Found Dockerfile at ./frontend/Dockerfile"
                                DOCKERFILE_PATH="./frontend/Dockerfile"
                                BUILD_CONTEXT="./frontend"
                            else
                                echo "ERROR: No Containerfile or Dockerfile found in frontend directory!"
                                ls -la ./frontend/ || echo "Frontend directory not found"
                                exit 1
                            fi
                            
                            echo "Building frontend image with rootless buildah..."
                            echo "Using Containerfile: $DOCKERFILE_PATH"
                            echo "Using build context: $BUILD_CONTEXT"
                            
                            buildah --storage-driver=vfs bud --isolation=chroot -f $DOCKERFILE_PATH -t ${FRONTEND_IMAGE} $BUILD_CONTEXT
                            
                            echo "Pushing frontend image to Quay.io..."
                            buildah --storage-driver=vfs push ${FRONTEND_IMAGE}
                        '''
                    }
                }
            }
        }
        
        stage('Build and Push Backend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/buildah/stable:latest
                            command: ['cat']
                            tty: true
                            securityContext:
                              runAsUser: 1000
                              runAsGroup: 1000
                              fsGroup: 1000
                            resources:
                              requests:
                                memory: "512Mi"
                                cpu: "500m"
                              limits:
                                memory: "2Gi"
                                cpu: "2"
                            env:
                            - name: STORAGE_DRIVER
                              value: vfs
                            - name: BUILDAH_ISOLATION
                              value: chroot
                            volumeMounts:
                            - name: buildah-storage
                              mountPath: /home/build/.local/share/containers
                          volumes:
                          - name: buildah-storage
                            emptyDir: {}
                    '''
                }
            }
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                        sh '''
                            echo "=== DEBUGGING BACKEND STRUCTURE ==="
                            ls -la backend/ || echo "Backend directory not found"
                            echo "=== END DEBUG ==="
                            
                            echo "Setting up buildah for rootless builds..."
                            buildah --storage-driver=vfs login -u $QUAY_USER -p $QUAY_PASS quay.io

                            # Check if backend Containerfile exists
                            if [ -f "./backend/Containerfile" ]; then
                                echo "Found backend Containerfile at ./backend/Containerfile"
                                DOCKERFILE_PATH="./backend/Containerfile"
                                BUILD_CONTEXT="./backend"
                            elif [ -f "./backend/Dockerfile" ]; then
                                echo "Found backend Dockerfile at ./backend/Dockerfile"
                                DOCKERFILE_PATH="./backend/Dockerfile"
                                BUILD_CONTEXT="./backend"
                            else
                                echo "ERROR: No backend Containerfile or Dockerfile found!"
                                ls -la ./backend/ || echo "Backend directory not found"
                                exit 1
                            fi

                            echo "Building backend image with rootless buildah..."
                            echo "Using Containerfile: $DOCKERFILE_PATH"
                            echo "Using build context: $BUILD_CONTEXT"
                            
                            buildah --storage-driver=vfs bud --isolation=chroot -f $DOCKERFILE_PATH -t ${BACKEND_IMAGE} $BUILD_CONTEXT

                            echo "Pushing backend image to Quay.io..."
                            buildah --storage-driver=vfs push ${BACKEND_IMAGE}
                        '''
                    }
                }
            }
        }

        stage('Deploy Applications') {
            agent any
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying applications to OpenShift from Quay.io..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        # Clean up existing resources
                        oc delete all -l app=job-frontend --ignore-not-found=true
                        oc delete all -l app=job-backend --ignore-not-found=true

                        # Deploy frontend
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        # Deploy backend
                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend

                        echo "Deployment completed successfully"
                        echo "Frontend route: $(oc get route job-frontend -o jsonpath='{.spec.host}' 2>/dev/null || echo 'Route not ready yet')"
                        echo "Backend route: $(oc get route job-backend -o jsonpath='{.spec.host}' 2>/dev/null || echo 'Route not ready yet')"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed'
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}